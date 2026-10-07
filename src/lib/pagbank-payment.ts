import {
  getPagBankToken,
  pagBankApiUrl,
} from "@/lib/pagbank-api";
import { plans, type PlanSlug } from "@/lib/plans";

export type PagBankMethod = "PIX" | "CREDIT_CARD";
export type PagBankOrderStatus =
  | "PENDING"
  | "IN_ANALYSIS"
  | "PAID"
  | "DECLINED"
  | "CANCELED"
  | "EXPIRED";

export type ParsedPagBankReference = {
  referenceId: string;
  plan: PlanSlug;
  method: PagBankMethod;
  amountCents: number;
};

export class PagBankApiError extends Error {}

export function parsePagBankReference(
  value: unknown
): ParsedPagBankReference | null {
  if (typeof value !== "string") return null;
  const match =
    /^cs:(mensal|anual):(PIX|CREDIT_CARD):([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.exec(
      value
    );
  if (!match) return null;

  const plan = match[1].toLowerCase() as PlanSlug;
  const method = match[2].toUpperCase() as PagBankMethod;
  return {
    referenceId: value,
    plan,
    method,
    amountCents:
      method === "PIX"
        ? plans[plan].pixPriceInCents
        : plans[plan].cardPriceInCents,
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function fetchPagBankJson(url: string, token: string) {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new PagBankApiError("Não foi possível consultar a API do PagBank.");
  }

  if (!response.ok) {
    throw new PagBankApiError("O PagBank não conseguiu consultar o pedido.");
  }
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new PagBankApiError("O PagBank retornou uma resposta inválida.");
  }
}

type VerifiedOrderStatus = {
  status: PagBankOrderStatus;
  amountCents: number;
  method: PagBankMethod;
};

function mapChargeStatus(status: unknown): PagBankOrderStatus | null {
  switch (status) {
    case "WAITING":
      return "PENDING";
    case "IN_ANALYSIS":
      return "IN_ANALYSIS";
    case "PAID":
      return "PAID";
    case "DECLINED":
      return "DECLINED";
    case "CANCELED":
      return "CANCELED";
    case "EXPIRED":
      return "EXPIRED";
    default:
      return null;
  }
}

export function validatePagBankOrder(
  value: unknown,
  paymentOrderId: string,
  expected: ParsedPagBankReference
): VerifiedOrderStatus | null {
  if (
    !isRecord(value) ||
    value.id !== paymentOrderId ||
    value.reference_id !== expected.referenceId ||
    !Array.isArray(value.items) ||
    value.items.length !== 1 ||
    !isRecord(value.items[0]) ||
    value.items[0].reference_id !== expected.plan ||
    value.items[0].quantity !== 1 ||
    value.items[0].unit_amount !== expected.amountCents ||
    !Array.isArray(value.charges)
  ) {
    return null;
  }

  if (value.charges.length === 0) {
    return {
      status: "PENDING",
      amountCents: expected.amountCents,
      method: expected.method,
    };
  }

  const statuses: PagBankOrderStatus[] = [];
  for (const charge of value.charges) {
    if (
      !isRecord(charge) ||
      typeof charge.id !== "string" ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(charge.id) ||
      !isRecord(charge.amount) ||
      charge.amount.value !== expected.amountCents ||
      charge.amount.currency !== "BRL" ||
      !isRecord(charge.payment_method) ||
      charge.payment_method.type !== expected.method
    ) {
      return null;
    }

    const status = mapChargeStatus(charge.status);
    if (!status) return null;
    statuses.push(status);
  }

  if (statuses.filter((status) => status === "PAID").length > 1) {
    return null;
  }

  return {
    status: statuses.includes("PAID")
      ? "PAID"
      : statuses.includes("IN_ANALYSIS")
        ? "IN_ANALYSIS"
        : statuses.includes("PENDING")
          ? "PENDING"
          : statuses.includes("DECLINED")
            ? "DECLINED"
            : "CANCELED",
    amountCents: expected.amountCents,
    method: expected.method,
  };
}

export async function fetchVerifiedPagBankOrder(
  paymentOrderId: string,
  expected: ParsedPagBankReference
) {
  if (!/^ORDE_[A-Za-z0-9-]{1,100}$/.test(paymentOrderId)) return null;

  const token = getPagBankToken();
  const order = await fetchPagBankJson(
    pagBankApiUrl(`orders/${encodeURIComponent(paymentOrderId)}`),
    token
  );
  return validatePagBankOrder(order, paymentOrderId, expected);
}

export async function fetchVerifiedPagBankCheckout(
  checkoutId: string,
  expected: ParsedPagBankReference
) {
  if (!/^CHEC_[A-Za-z0-9-]{1,100}$/.test(checkoutId)) return null;

  const token = getPagBankToken();

  const checkout = await fetchPagBankJson(
    `${pagBankApiUrl(`checkouts/${encodeURIComponent(checkoutId)}`)}?limit=100`,
    token
  );
  if (
    !isRecord(checkout) ||
    checkout.id !== checkoutId ||
    checkout.reference_id !== expected.referenceId ||
    !Array.isArray(checkout.items) ||
    checkout.items.length !== 1 ||
    !isRecord(checkout.items[0]) ||
    checkout.items[0].reference_id !== expected.plan ||
    checkout.items[0].quantity !== 1 ||
    checkout.items[0].unit_amount !== expected.amountCents ||
    !Array.isArray(checkout.payment_methods) ||
    !checkout.payment_methods.some(
      (method) => isRecord(method) && method.type === expected.method
    ) ||
    checkout.payment_methods.some(
      (method) =>
        isRecord(method) &&
        method.type !== expected.method &&
        ["PIX", "CREDIT_CARD"].includes(String(method.type))
    )
  ) {
    return null;
  }

  if (checkout.status === "EXPIRED") {
    return {
      status: "EXPIRED" as const,
      amountCents: expected.amountCents,
      method: expected.method,
    };
  }

  if (!Array.isArray(checkout.orders)) {
    throw new PagBankApiError(
      "A consulta do checkout não retornou os pedidos associados."
    );
  }
  if (checkout.orders.length === 0) {
    return {
      status: "PENDING" as const,
      amountCents: expected.amountCents,
      method: expected.method,
    };
  }

  const statuses: PagBankOrderStatus[] = [];
  for (const associatedOrder of checkout.orders) {
    const paymentOrderId =
      isRecord(associatedOrder) ? associatedOrder.id : associatedOrder;
    if (
      typeof paymentOrderId !== "string" ||
      !/^ORDE_[A-Za-z0-9-]{1,100}$/.test(paymentOrderId)
    ) {
      throw new PagBankApiError(
        "O PagBank retornou um identificador de pedido inválido."
      );
    }
    const verifiedOrder = await fetchVerifiedPagBankOrder(
      paymentOrderId,
      expected
    );
    if (!verifiedOrder) {
      throw new PagBankApiError(
        "Os dados do pedido retornados pelo PagBank não correspondem à compra."
      );
    }
    statuses.push(verifiedOrder.status);
  }

  return {
    status: statuses.includes("PAID")
      ? "PAID"
      : statuses.includes("IN_ANALYSIS")
        ? "IN_ANALYSIS"
        : statuses.includes("PENDING")
          ? "PENDING"
          : statuses.includes("DECLINED")
            ? "DECLINED"
            : "CANCELED",
    amountCents: expected.amountCents,
    method: expected.method,
  };
}
