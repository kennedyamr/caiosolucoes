import { createHash, timingSafeEqual } from "node:crypto";
import {
  getPagBankToken,
  PagBankConfigurationError,
} from "@/lib/pagbank-api";
import {
  fetchVerifiedPagBankCheckout,
  fetchVerifiedPagBankOrder,
  PagBankApiError,
  parsePagBankReference,
} from "@/lib/pagbank-payment";

export const runtime = "nodejs";

const maxPayloadBytes = 1_000_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function signatureMatches(rawBody: string, token: string, signature: string) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHash("sha256")
    .update(`${token}-${rawBody}`, "utf8")
    .digest();
  const provided = Buffer.from(signature, "hex");
  return (
    expected.length === provided.length &&
    timingSafeEqual(expected, provided)
  );
}

export async function POST(request: Request) {
  let token: string;
  try {
    token = getPagBankToken();
  } catch (error) {
    if (!(error instanceof PagBankConfigurationError)) throw error;
    return Response.json(
      { error: "Webhook PagBank indisponível." },
      { status: 503 }
    );
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxPayloadBytes) {
    return Response.json({ error: "Notificação muito grande." }, { status: 413 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > maxPayloadBytes) {
    return Response.json({ error: "Notificação muito grande." }, { status: 413 });
  }

  const signature = request.headers.get("x-authenticity-token") ?? "";
  if (!signatureMatches(rawBody, token, signature)) {
    return Response.json({ error: "Notificação não autorizada." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Notificação inválida." }, { status: 400 });
  }
  if (
    !isRecord(payload) ||
    typeof payload.id !== "string" ||
    typeof payload.reference_id !== "string"
  ) {
    return Response.json({ received: true, ignored: true });
  }

  const expected = parsePagBankReference(payload.reference_id);
  if (!expected) {
    return Response.json({ received: true, ignored: true });
  }

  try {
    let verified: { status: string } | null = null;
    if (/^ORDE_[A-Za-z0-9-]{1,100}$/.test(payload.id)) {
      verified = await fetchVerifiedPagBankOrder(payload.id, expected);
    } else if (/^CHEC_[A-Za-z0-9-]{1,100}$/.test(payload.id)) {
      verified = await fetchVerifiedPagBankCheckout(payload.id, expected);
    } else {
      return Response.json({ received: true, ignored: true });
    }

    if (!verified) {
      return Response.json(
        { error: "Não foi possível validar a notificação de pagamento." },
        { status: 502 }
      );
    }

    return Response.json({ received: true, status: verified.status });
  } catch (error) {
    if (error instanceof PagBankApiError) {
      console.error("Unable to verify the PagBank notification.");
      return Response.json(
        { error: "Não foi possível consultar o pedido no PagBank." },
        { status: 502 }
      );
    }
    console.error("Failed to process the PagBank notification.");
    return Response.json(
      { error: "Não foi possível processar a notificação." },
      { status: 500 }
    );
  }
}
