import { randomUUID } from "node:crypto";
import { isPlanSlug, plans } from "@/lib/plans";
import { parseInfinitePayCheckoutUrl } from "@/lib/infinitepay-url";

export const runtime = "nodejs";

const infinitePayLinksUrl = "https://api.checkout.infinitepay.io/links";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeErrorDetails(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};

  const result: Record<string, unknown> = {};
  for (const key of ["success", "error", "message", "code", "error_code"]) {
    const field = value[key];
    if (typeof field === "boolean") {
      result[key] = field;
    } else if (typeof field === "string") {
      result[key] = field.slice(0, 500);
    }
  }

  for (const key of ["errors", "error_messages", "details"]) {
    const field = value[key];
    if (!Array.isArray(field)) continue;

    const items: unknown[] = field.slice(0, 10).flatMap((item): unknown[] => {
      if (typeof item === "string") return [item.slice(0, 500)];
      if (!isRecord(item)) return [];

      const detail: Record<string, string> = {};
      for (const detailKey of ["code", "field", "message", "description"]) {
        if (typeof item[detailKey] === "string") {
          detail[detailKey] = item[detailKey].slice(0, 500);
        }
      }
      return Object.keys(detail).length > 0 ? [detail] : [];
    });

    if (items.length > 0) result[key] = items;
  }

  return result;
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
    const responseText = await response.text();
    let responseBody: unknown;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = null;
    }
    return Response.json(
      {
        error: "A InfinitePay não conseguiu iniciar o checkout.",
        infinitepayStatus: response.status,
        infinitepayError: safeErrorDetails(responseBody),
      },
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
