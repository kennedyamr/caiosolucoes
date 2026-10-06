import { NextResponse } from "next/server";
import {
  getPixOrder,
  savePixQrCode,
  updatePixOrderStatus,
  WebhookStoreConfigurationError,
  type PixOrderStatus,
} from "@/lib/asaas-webhook-store";
import {
  AsaasConfigurationError,
  asaasApiUrl,
  getAsaasApiKey,
} from "@/lib/asaas-api";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPaymentStatus(status: unknown): Exclude<
  PixOrderStatus,
  "CREATING" | "FAILED"
> | null {
  switch (status) {
    case "CONFIRMED":
    case "RECEIVED":
      return "PAID";
    case "OVERDUE":
      return "EXPIRED";
    case "DELETED":
      return "CANCELED";
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return "REFUNDED";
    case "PENDING":
    case "AWAITING_RISK_ANALYSIS":
    case "AUTHORIZED":
      return "PENDING";
    default:
      return null;
  }
}

export async function GET(
  _request: Request,
  context: RouteContext<"/api/pix/status/[orderId]">
) {
  const { orderId } = await context.params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      orderId
    )
  ) {
    return NextResponse.json({ error: "Pedido Pix inválido." }, { status: 400 });
  }

  let order;
  try {
    order = await getPixOrder(orderId);
  } catch (error) {
    if (error instanceof WebhookStoreConfigurationError) {
      return NextResponse.json(
        { error: "A consulta de pagamento está temporariamente indisponível." },
        { status: 503 }
      );
    }
    console.error("Unable to load Pix order status.", error);
    return NextResponse.json(
      { error: "Não foi possível consultar o pagamento agora." },
      { status: 503 }
    );
  }

  if (!order) {
    return NextResponse.json({ error: "Pedido Pix não encontrado." }, { status: 404 });
  }
  if (order.status === "FAILED" || order.status === "CREATING") {
    return NextResponse.json({ status: order.status });
  }
  if (order.status === "PAID" || order.status === "REFUNDED") {
    return NextResponse.json({
      status: order.status,
      orderId: order.orderId,
      amountCents: order.amountCents,
    });
  }
  if (!order.paymentId) {
    return NextResponse.json({ status: order.status });
  }

  let apiKey: string;
  let paymentEndpoint: string;
  try {
    apiKey = getAsaasApiKey();
    paymentEndpoint = asaasApiUrl(
      `payments/${encodeURIComponent(order.paymentId)}`
    );
  } catch (error) {
    if (!(error instanceof AsaasConfigurationError)) throw error;
    return NextResponse.json(
      { error: "A consulta ao Asaas está temporariamente indisponível." },
      { status: 503 }
    );
  }

  let qrCode = order.qrCodeBase64;
  let copyPaste = order.pixPayload;
  if (!qrCode || !copyPaste) {
    try {
      const qrResponse = await fetch(
        asaasApiUrl(`payments/${encodeURIComponent(order.paymentId)}/pixQrCode`),
        {
          headers: { accept: "application/json", access_token: apiKey },
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        }
      );
      if (!qrResponse.ok) {
        throw new Error("Asaas could not regenerate the Pix QR code.");
      }
      const qr: unknown = await qrResponse.json();
      if (
        typeof qr !== "object" ||
        qr === null ||
        !("encodedImage" in qr) ||
        typeof qr.encodedImage !== "string" ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(qr.encodedImage) ||
        !("payload" in qr) ||
        typeof qr.payload !== "string" ||
        qr.payload.length < 10 ||
        qr.payload.length > 10000
      ) {
        throw new Error("Asaas returned an invalid Pix QR code.");
      }
      const expirationDate =
        "expirationDate" in qr &&
        typeof qr.expirationDate === "string" &&
        Number.isFinite(Date.parse(qr.expirationDate))
          ? new Date(qr.expirationDate).toISOString()
          : null;
      await savePixQrCode(
        order.orderId,
        order.paymentId,
        qr.payload,
        qr.encodedImage,
        expirationDate
      );
      qrCode = qr.encodedImage;
      copyPaste = qr.payload;
      order.expiresAt = expirationDate;
    } catch (error) {
      console.error("Unable to retrieve the Pix QR code for an existing order.", error);
      return NextResponse.json(
        { error: "Não foi possível recuperar o QR Code Pix. Tente novamente." },
        { status: 502 }
      );
    }
  }

  let response: Response;
  try {
    response = await fetch(paymentEndpoint, {
      headers: {
        accept: "application/json",
        access_token: apiKey,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    console.error("Unable to verify Pix payment status with Asaas.", error);
    return NextResponse.json(
      { error: "A consulta ao Asaas falhou. Vamos tentar novamente." },
      { status: 503 }
    );
  }

  if (!response.ok) {
    console.error("Asaas rejected a Pix payment status request.", response.status);
    return NextResponse.json(
      { error: "O Asaas não conseguiu consultar este pagamento." },
      { status: 502 }
    );
  }

  let payment: unknown;
  try {
    payment = await response.json();
  } catch {
    return NextResponse.json(
      { error: "O Asaas retornou uma resposta inválida." },
      { status: 502 }
    );
  }

  if (
    !isRecord(payment) ||
    payment.id !== order.paymentId ||
    payment.externalReference !== order.orderId ||
    payment.billingType !== "PIX" ||
    typeof payment.value !== "number" ||
    Math.round(payment.value * 100) !== order.amountCents
  ) {
    console.error("Asaas Pix status response did not match the local order.");
    return NextResponse.json(
      { error: "Os dados do pagamento não correspondem ao pedido." },
      { status: 502 }
    );
  }

  const status = getPaymentStatus(payment.status);
  if (!status) {
    return NextResponse.json(
      { error: "O Asaas retornou um status de pagamento não reconhecido." },
      { status: 502 }
    );
  }

  try {
    await updatePixOrderStatus(order.orderId, status);
  } catch (error) {
    console.error("Unable to save verified Pix payment status.", error);
    return NextResponse.json(
      { error: "Não foi possível registrar o status do pagamento." },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status,
    orderId: order.orderId,
    qrCode: `data:image/png;base64,${qrCode}`,
    copyPaste,
    amountCents: order.amountCents,
    expirationDate: order.expiresAt,
  });
}
