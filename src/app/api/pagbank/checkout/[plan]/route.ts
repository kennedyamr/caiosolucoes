import { randomUUID } from "node:crypto";
import { isPlanSlug, plans } from "@/lib/plans";
import {
  getPagBankToken,
  getPublicSiteOrigin,
  isPagBankPaymentUrl,
  PagBankConfigurationError,
  pagBankApiUrl,
} from "@/lib/pagbank-api";

export const runtime = "nodejs";

const allowedHostnames = new Set([
  "caiosolucoes.vercel.app",
  "caiosolucoes.com.br",
  "www.caiosolucoes.com.br",
]);
const vercelDeploymentHostname =
  /^caiosolucoes-[a-z0-9-]+-caiofilhoamorim50-5666\.vercel\.app$/;

function isAllowedOrigin(value: string | null): boolean {
  if (!value) return false;

  try {
    const origin = new URL(value);
    return (
      origin.protocol === "https:" &&
      origin.username === "" &&
      origin.password === "" &&
      origin.port === "" &&
      origin.pathname === "/" &&
      origin.search === "" &&
      origin.hash === "" &&
      (allowedHostnames.has(origin.hostname) ||
        vercelDeploymentHostname.test(origin.hostname))
    );
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status });
}

function redactSecret(value: string, secret: string) {
  return value.replaceAll(secret, "[REDACTED]").slice(0, 500);
}

function safePagBankDiagnostics(
  body: unknown,
  token: string
): Record<string, unknown> {
  if (!isRecord(body)) return {};
  const diagnostics: Record<string, unknown> = {};

  for (const field of ["error_messages", "error", "description", "message"]) {
    const value = body[field];
    if (typeof value === "string") {
      diagnostics[field] = redactSecret(value, token);
    } else if (Array.isArray(value)) {
      const messages: unknown[] = [];
      for (const item of value) {
        if (typeof item === "string") {
          messages.push(redactSecret(item, token));
        } else if (isRecord(item)) {
          const details: Record<string, string> = {};
          for (const key of ["code", "field", "message", "description"]) {
            if (typeof item[key] === "string") {
              details[key] = redactSecret(item[key], token);
            }
          }
          if (Object.keys(details).length > 0) messages.push(details);
        }
      }
      if (messages.length > 0) {
        diagnostics[field] = messages;
      }
    } else if (isRecord(value)) {
      const details: Record<string, string> = {};
      for (const key of ["code", "field", "message", "description"]) {
        if (typeof value[key] === "string") {
          details[key] = redactSecret(value[key], token);
        }
      }
      if (Object.keys(details).length > 0) diagnostics[field] = details;
    }
  }

  return diagnostics;
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/pagbank/checkout/[plan]">
) {
  const { plan: slug } = await context.params;
  if (!isPlanSlug(slug)) {
    return errorResponse("Plano não encontrado.", 404);
  }

  const paymentMethod = new URL(request.url).searchParams.get("method");
  if (paymentMethod !== "PIX" && paymentMethod !== "CREDIT_CARD") {
    return errorResponse("Escolha Pix ou cartão de crédito.", 400);
  }

  const requestOrigin = request.headers.get("origin");
  let siteOrigin: string;
  let token: string;
  try {
    siteOrigin = getPublicSiteOrigin();
    token = getPagBankToken();
  } catch (error) {
    if (!(error instanceof PagBankConfigurationError)) throw error;
    return errorResponse(error.message, 503);
  }

  if (!isAllowedOrigin(requestOrigin)) {
    return errorResponse("Origem não autorizada para iniciar o checkout.", 403);
  }

  const orderReference = `cs:${slug}:${paymentMethod}:${randomUUID()}`;
  const plan = plans[slug];
  const amountInCents =
    paymentMethod === "PIX"
      ? plan.pixPriceInCents
      : plan.cardPriceInCents;
  const webhookUrl = `${siteOrigin}/api/webhooks/pagbank`;
  const returnUrl = new URL("/obrigado", siteOrigin);
  returnUrl.searchParams.set("pedido", orderReference);
  returnUrl.searchParams.set("plano", slug);
  returnUrl.searchParams.set("metodo", paymentMethod);

  if (webhookUrl.length > 100 || returnUrl.toString().length > 255) {
    return errorResponse(
      "A configuração de URL pública excede os limites aceitos pelo PagBank.",
      503
    );
  }

  let pagBankResponse: Response;
  try {
    pagBankResponse = await fetch(pagBankApiUrl("checkouts"), {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        reference_id: orderReference,
        customer_modifiable: true,
        items: [
          {
            reference_id: slug,
            name: plan.checkoutItemName,
            quantity: 1,
            unit_amount: amountInCents,
          },
        ],
        payment_methods: [{ type: paymentMethod }],
        redirect_url: returnUrl.toString(),
        return_url: returnUrl.toString(),
        notification_urls: [webhookUrl],
        payment_notification_urls: [webhookUrl],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    console.error("Unable to reach the PagBank checkout API.");
    return errorResponse(
      "Não foi possível conectar ao PagBank para iniciar o checkout.",
      502
    );
  }

  if (!pagBankResponse.ok) {
    const responseText = await pagBankResponse.text();
    let responseBody: unknown;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = null;
    }
    const pagbankError = safePagBankDiagnostics(responseBody, token);
    console.error("PagBank rejected checkout creation.", pagBankResponse.status);
    return Response.json(
      {
        error: "PagBank rejeitou o checkout.",
        pagbankStatus: pagBankResponse.status,
        pagbankError:
          Object.keys(pagbankError).length > 0
            ? pagbankError
            : "Resposta sem campos de diagnóstico seguros reconhecidos.",
      },
      { status: 502 }
    );
  }

  let checkout: unknown;
  try {
    checkout = await pagBankResponse.json();
  } catch {
    return errorResponse(
      "O PagBank retornou uma resposta inválida ao iniciar o checkout.",
      502
    );
  }

  if (
    !isRecord(checkout) ||
    checkout.reference_id !== orderReference ||
    typeof checkout.id !== "string" ||
    !/^CHEC_[A-Za-z0-9-]{1,100}$/.test(checkout.id) ||
    !Array.isArray(checkout.links) ||
    !Array.isArray(checkout.items) ||
    checkout.items.length !== 1 ||
    !isRecord(checkout.items[0]) ||
    checkout.items[0].reference_id !== slug ||
    checkout.items[0].quantity !== 1 ||
    checkout.items[0].unit_amount !== amountInCents ||
    !Array.isArray(checkout.payment_methods)
  ) {
    return errorResponse(
      "O PagBank não retornou um checkout válido.",
      502
    );
  }

  const acceptedMethods = checkout.payment_methods
    .filter(isRecord)
    .map((method) => method.type);
  const unavailableMethod =
    paymentMethod === "PIX" ? "CREDIT_CARD" : "PIX";
  if (
    !acceptedMethods.includes(paymentMethod) ||
    acceptedMethods.includes(unavailableMethod)
  ) {
    return errorResponse(
      "O PagBank não confirmou o método e o valor selecionados.",
      502
    );
  }

  const paymentLink = checkout.links.find(
    (link) =>
      isRecord(link) &&
      link.rel === "PAY" &&
      typeof link.href === "string" &&
      isPagBankPaymentUrl(link.href)
  );

  if (!isRecord(paymentLink) || typeof paymentLink.href !== "string") {
    return errorResponse(
      "O PagBank não retornou um endereço seguro para o checkout.",
      502
    );
  }

  return Response.json({
    checkoutUrl: paymentLink.href,
    checkoutId: checkout.id,
    referenceId: orderReference,
  });
}
