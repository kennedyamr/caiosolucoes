import {
  fetchVerifiedPagBankCheckout,
  PagBankApiError,
  parsePagBankReference,
} from "@/lib/pagbank-payment";
import { PagBankConfigurationError } from "@/lib/pagbank-api";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: RouteContext<"/api/pagbank/status/[referenceId]">
) {
  const { referenceId } = await context.params;
  const parsedReference = parsePagBankReference(referenceId);
  if (!parsedReference) {
    return Response.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const checkoutId = new URL(request.url).searchParams.get("checkoutId");
  if (
    !checkoutId ||
    !/^CHEC_[A-Za-z0-9-]{1,100}$/.test(checkoutId)
  ) {
    return Response.json({ error: "Checkout inválido." }, { status: 400 });
  }

  try {
    const payment = await fetchVerifiedPagBankCheckout(
      checkoutId,
      parsedReference
    );
    if (!payment) {
      return Response.json(
        { error: "Os dados do checkout não correspondem a este pedido." },
        { status: 404 }
      );
    }

    return Response.json(
      {
        status: payment.status,
        plan: parsedReference.plan,
        method: payment.method,
        amountCents: payment.amountCents,
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    if (
      error instanceof PagBankApiError ||
      error instanceof PagBankConfigurationError
    ) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    console.error("Unable to verify PagBank checkout status.");
    return Response.json(
      { error: "Não foi possível consultar o pagamento agora." },
      { status: 503 }
    );
  }
}
