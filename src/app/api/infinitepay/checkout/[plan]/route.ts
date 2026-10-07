import { randomUUID } from "node:crypto";
import { isPlanSlug, plans } from "@/lib/plans";
import { parseInfinitePayCheckoutUrl } from "@/lib/infinitepay-url";

export const runtime = "nodejs";

const infinitePayLinksUrl = "https://api.checkout.infinitepay.io/links";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(
  _request: Request,
  context: RouteContext<"/api/infinitepay/checkout/[plan]">
) {
  const { plan: slug } = await context.params;
  if (!isPlanSlug(slug)) {
    return Response.json({ error: "Plano não encontrado." }, { status: 404 });
  }

  const handle = process.env.INFINITEPAY_HANDLE?.trim();
  if (!handle) {
    return Response.json(
      { error: "A InfiniteTag não está configurada no servidor." },
      { status: 503 }
    );
  }

  const product = plans[slug];
  let response: Response;
  try {
    response = await fetch(infinitePayLinksUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        handle,
        order_nsu: randomUUID(),
        items: [
          {
            quantity: 1,
            price: product.cardPriceInCents,
            description: product.checkoutItemName,
          },
        ],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    console.error("Unable to reach the InfinitePay checkout API.");
    return Response.json(
      { error: "Não foi possível conectar à InfinitePay. Tente novamente." },
      { status: 502 }
    );
  }

  if (!response.ok) {
    console.error("InfinitePay rejected checkout creation.", response.status);
    return Response.json(
      { error: "A InfinitePay não conseguiu iniciar o checkout." },
      { status: 502 }
    );
  }

  let checkout: unknown;
  try {
    checkout = await response.json();
  } catch {
    return Response.json(
      { error: "A InfinitePay retornou uma resposta inválida." },
      { status: 502 }
    );
  }

  if (!isRecord(checkout) || typeof checkout.url !== "string") {
    return Response.json(
      { error: "A InfinitePay não retornou um link de checkout válido." },
      { status: 502 }
    );
  }

  const checkoutUrl = parseInfinitePayCheckoutUrl(checkout.url);
  if (!checkoutUrl) {
    return Response.json(
      { error: "A InfinitePay retornou um link de checkout inválido." },
      { status: 502 }
    );
  }

  return Response.json({ checkoutUrl: checkoutUrl.toString() });
}
