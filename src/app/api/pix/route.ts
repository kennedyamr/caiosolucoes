import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  createPixOrder,
  markPixOrderFailed,
  attachPixPayment,
  savePixQrCode,
  WebhookStoreConfigurationError,
} from "@/lib/asaas-webhook-store";
import {
  AsaasConfigurationError,
  asaasApiUrl,
  getAsaasApiKey,
} from "@/lib/asaas-api";
import { isPlanSlug, plans } from "@/lib/plans";

export const runtime = "nodejs";

const maxRequestLength = 10_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidCpf(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1+$/.test(cpf)) return false;

  const digits = [...cpf].map(Number);
  for (let position = 9; position < 11; position++) {
    const sum = digits
      .slice(0, position)
      .reduce((total, digit, index) => total + digit * (position + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    if (digits[position] !== (remainder === 10 ? 0 : remainder)) return false;
  }

  return true;
}

async function readJson(response: Response) {
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new Error("O Asaas retornou uma resposta inválida.");
  }

  if (!response.ok) {
    throw new Error(
      "O Asaas não conseguiu criar o pagamento Pix. Confira a conta e tente novamente."
    );
  }

  if (!isRecord(value)) {
    throw new Error("O Asaas retornou uma resposta inválida.");
  }

  return value;
}

export async function POST(request: Request) {
  if (
    Number(request.headers.get("content-length") ?? "0") > maxRequestLength
  ) {
    return NextResponse.json(
      { error: "Os dados enviados são muito grandes." },
      { status: 413 }
    );
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > maxRequestLength) {
      return NextResponse.json(
        { error: "Os dados enviados são muito grandes." },
        { status: 413 }
      );
    }
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Dados de compra inválidos." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Dados de compra inválidos." }, { status: 400 });
  }

  const planSlug = typeof body.plan === "string" ? body.plan : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const cpf = typeof body.cpf === "string" ? body.cpf.replace(/\D/g, "") : "";

  if (!isPlanSlug(planSlug)) {
    return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 });
  }
  if (name.length < 2 || name.length > 100) {
    return NextResponse.json(
      { error: "Informe seu nome completo." },
      { status: 400 }
    );
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Informe um e-mail válido." },
      { status: 400 }
    );
  }
  if (!isValidCpf(cpf)) {
    return NextResponse.json(
      { error: "Informe um CPF válido para gerar a cobrança Pix." },
      { status: 400 }
    );
  }

  let apiKey: string;
  let customerEndpoint: string;
  let paymentsEndpoint: string;
  try {
    apiKey = getAsaasApiKey();
    customerEndpoint = asaasApiUrl("customers");
    paymentsEndpoint = asaasApiUrl("payments");
  } catch (error) {
    if (!(error instanceof AsaasConfigurationError)) throw error;
    return NextResponse.json(
      { error: `Checkout Pix indisponível: ${error.message}` },
      { status: 503 }
    );
  }

  const orderId = randomUUID();
  const plan = plans[planSlug];

  try {
    await createPixOrder(orderId, planSlug, plan.pixPriceInCents);
  } catch (error) {
    if (error instanceof WebhookStoreConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Unable to create a local Pix order.", error);
    return NextResponse.json(
      { error: "Não foi possível iniciar o pedido Pix. Tente novamente." },
      { status: 503 }
    );
  }

  let paymentId: string | null = null;

  try {
    const customerResponse = await fetch(customerEndpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        access_token: apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({ name, email, cpfCnpj: cpf }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const customer = await readJson(customerResponse);

    if (typeof customer.id !== "string" || customer.id.length > 100) {
      throw new Error("O Asaas não retornou um cadastro válido.");
    }

    const dueDate = new Date(Date.now() + 48 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const paymentResponse = await fetch(paymentsEndpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        access_token: apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        customer: customer.id,
        billingType: "PIX",
        value: plan.pixPriceInCents / 100,
        dueDate,
        description: `${plan.checkoutItemName} - Caio Soluções`,
        externalReference: orderId,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const payment = await readJson(paymentResponse);

    if (
      typeof payment.id !== "string" ||
      payment.id.length > 100 ||
      payment.billingType !== "PIX" ||
      typeof payment.value !== "number" ||
      Math.round(payment.value * 100) !== plan.pixPriceInCents ||
      payment.externalReference !== orderId
    ) {
      throw new Error("O Asaas retornou uma cobrança Pix com dados inválidos.");
    }

    paymentId = payment.id;
    await attachPixPayment(orderId, paymentId);

    const qrResponse = await fetch(
      asaasApiUrl(`payments/${encodeURIComponent(paymentId)}/pixQrCode`),
      {
        headers: {
          accept: "application/json",
          access_token: apiKey,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }
    );
    const qrCode = await readJson(qrResponse);

    if (
      typeof qrCode.encodedImage !== "string" ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(qrCode.encodedImage) ||
      typeof qrCode.payload !== "string" ||
      qrCode.payload.length < 10 ||
      qrCode.payload.length > 10000
    ) {
      throw new Error("O Asaas não retornou um QR Code Pix válido.");
    }

    const expirationDate =
      typeof qrCode.expirationDate === "string" &&
      Number.isFinite(Date.parse(qrCode.expirationDate))
        ? new Date(qrCode.expirationDate).toISOString()
        : null;

    await savePixQrCode(
      orderId,
      paymentId,
      qrCode.payload,
      qrCode.encodedImage,
      expirationDate
    );

    return NextResponse.json({
      orderId,
      qrCode: `data:image/png;base64,${qrCode.encodedImage}`,
      copyPaste: qrCode.payload,
      amountCents: plan.pixPriceInCents,
      expirationDate,
    });
  } catch (error) {
    console.error("Unable to create the Asaas Pix payment.", error);
    if (!paymentId) {
      try {
        await markPixOrderFailed(orderId);
      } catch (markFailedError) {
        console.error("Unable to mark the Pix order as failed.", markFailedError);
      }
    }

    const message =
      error instanceof Error &&
      (error.message.startsWith("Configure ") ||
        error.message.startsWith("ASAAS_API_URL"))
        ? error.message
        : error instanceof Error &&
            (error.message.startsWith("O Asaas") ||
              error.message.startsWith("O pagamento"))
          ? error.message
          : "Não foi possível gerar o Pix agora. Tente novamente.";
    return NextResponse.json(
      { error: message, ...(paymentId ? { orderId } : {}) },
      { status: 502 }
    );
  }
}
