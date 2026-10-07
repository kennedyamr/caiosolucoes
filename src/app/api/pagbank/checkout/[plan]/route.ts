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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status });
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

  if (requestOrigin && requestOrigin !== siteOrigin) {
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
    console.error("PagBank rejected checkout creation.", pagBankResponse.status);
    return errorResponse(
      "O PagBank não conseguiu iniciar o checkout. Tente novamente.",
      502
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
