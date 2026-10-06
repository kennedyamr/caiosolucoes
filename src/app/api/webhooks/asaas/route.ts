import { timingSafeEqual } from "node:crypto";
import {
  persistCheckoutEvent,
  WebhookStoreConfigurationError,
  type CheckoutEventType,
} from "@/lib/asaas-webhook-store";

export const runtime = "nodejs";

const maxPayloadBytes = 5_000_000;

function isCheckoutEventType(event: string): event is CheckoutEventType {
  return (
    event === "CHECKOUT_CREATED" ||
    event === "CHECKOUT_PAID" ||
    event === "CHECKOUT_CANCELED" ||
    event === "CHECKOUT_EXPIRED"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function tokensMatch(provided: string, configured: string) {
  const providedBytes = Buffer.from(provided);
  const configuredBytes = Buffer.from(configured);

  return (
    providedBytes.length === configuredBytes.length &&
    timingSafeEqual(providedBytes, configuredBytes)
  );
}

export async function POST(request: Request) {
  const configuredToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  if (!configuredToken || configuredToken.length < 32) {
    return Response.json(
      {
        error:
          "Webhook indisponível: configure ASAAS_WEBHOOK_TOKEN com pelo menos 32 caracteres.",
      },
      { status: 503 }
    );
  }

  const providedToken = request.headers.get("asaas-access-token") ?? "";
  if (!tokensMatch(providedToken, configuredToken)) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxPayloadBytes) {
    return Response.json({ error: "Evento muito grande." }, { status: 413 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > maxPayloadBytes) {
    return Response.json({ error: "Evento muito grande." }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (
    !isRecord(payload) ||
    typeof payload.id !== "string" ||
    payload.id.length < 1 ||
    payload.id.length > 200 ||
    typeof payload.event !== "string"
  ) {
    return Response.json({ error: "Evento inválido." }, { status: 400 });
  }

  if (!isCheckoutEventType(payload.event)) {
    return Response.json({ received: true, ignored: true });
  }

  const checkout = payload.checkout;
  const externalReference = isRecord(checkout)
    ? checkout.externalReference
    : undefined;
  if (
    !isRecord(checkout) ||
    typeof checkout.id !== "string" ||
    checkout.id.length < 1 ||
    checkout.id.length > 200 ||
    (externalReference !== undefined && typeof externalReference !== "string")
  ) {
    return Response.json({ error: "Dados do checkout inválidos." }, { status: 400 });
  }

  try {
    const result = await persistCheckoutEvent({
      id: payload.id,
      event: payload.event,
      checkoutId: checkout.id,
      externalReference:
        typeof externalReference === "string" ? externalReference : undefined,
      payload,
    });

    return Response.json({ received: true, duplicate: result === "duplicate" });
  } catch (error) {
    if (error instanceof WebhookStoreConfigurationError) {
      console.error(error.message);
      return Response.json(
        {
          error:
            "Persistência do webhook indisponível: configure DATABASE_URL com PostgreSQL.",
        },
        { status: 503 }
      );
    }

    console.error("Failed to persist the Asaas checkout webhook event.", error);
    return Response.json(
      { error: "Não foi possível persistir o evento do Asaas." },
      { status: 500 }
    );
  }
}
