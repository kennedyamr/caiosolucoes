"use client";

import { useEffect, useState } from "react";

type PaymentStatus =
  | "CREATING"
  | "PENDING"
  | "IN_ANALYSIS"
  | "PAID"
  | "DECLINED"
  | "CANCELED"
  | "EXPIRED"
  | "FAILED";

type CheckoutSession = {
  checkoutId: string;
  referenceId: string;
};

function isPaymentStatus(value: unknown): value is PaymentStatus {
  return (
    value === "CREATING" ||
    value === "PENDING" ||
    value === "IN_ANALYSIS" ||
    value === "PAID" ||
    value === "DECLINED" ||
    value === "CANCELED" ||
    value === "EXPIRED" ||
    value === "FAILED"
  );
}

function readCheckoutSession(referenceId: string): CheckoutSession | null {
  try {
    const value = window.sessionStorage.getItem(
      `pagbank-checkout:${referenceId}`
    );
    if (!value) return null;
    const session: unknown = JSON.parse(value);
    if (
      typeof session !== "object" ||
      session === null ||
      !("checkoutId" in session) ||
      typeof session.checkoutId !== "string" ||
      !/^CHEC_[A-Za-z0-9-]{1,100}$/.test(session.checkoutId) ||
      !("referenceId" in session) ||
      session.referenceId !== referenceId
    ) {
      return null;
    }
    return { checkoutId: session.checkoutId, referenceId };
  } catch {
    return null;
  }
}

export default function PaymentConfirmation({
  referenceId,
}: {
  referenceId: string | null;
}) {
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!referenceId) return;

    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const checkoutSession = readCheckoutSession(referenceId);
    if (!checkoutSession) {
      queueMicrotask(() => {
        if (active) setHasError(true);
      });
      return () => {
        active = false;
      };
    }
    const checkoutId = checkoutSession.checkoutId;
    const checkoutReference = checkoutSession.referenceId;

    const stopAt = Date.now() + 15 * 60 * 1000;

    async function checkStatus() {
      try {
        const response = await fetch(
          `/api/pagbank/status/${encodeURIComponent(checkoutReference)}?checkoutId=${encodeURIComponent(checkoutId)}`,
          { cache: "no-store" }
        );
        const result: unknown = await response.json();
        if (
          !response.ok ||
          typeof result !== "object" ||
          result === null ||
          !("status" in result) ||
          !isPaymentStatus(result.status)
        ) {
          throw new Error("Não foi possível consultar o pedido.");
        }
        if (!active) return;
        setStatus(result.status);
        setHasError(false);
        if (
          ["PAID", "DECLINED", "CANCELED", "EXPIRED", "FAILED"].includes(
            result.status
          )
        ) {
          return;
        }
      } catch {
        if (active) setHasError(true);
      }

      if (active && Date.now() < stopAt) {
        timer = setTimeout(checkStatus, 8000);
      }
    }

    void checkStatus();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [referenceId]);

  if (!referenceId) {
    return (
      <p className="thank-you-description">
        O PagBank enviará a confirmação do pagamento diretamente para a loja.
        Não é necessário enviar comprovante.
      </p>
    );
  }

  const message =
    status === "PAID"
      ? "Pagamento confirmado ✓"
      : status === "DECLINED"
        ? "O PagBank não aprovou o pagamento. Você pode tentar novamente."
        : status === "CANCELED"
          ? "Este pagamento foi cancelado."
          : status === "EXPIRED"
            ? "Este checkout expirou."
            : status === "FAILED"
              ? "Não foi possível iniciar o pagamento."
              : "Aguardando a confirmação do PagBank...";

  return (
    <div aria-live="polite" className="thank-you-description">
      <p>{hasError && !status
            ? "Não foi possível consultar o checkout do PagBank. Atualize a página para tentar novamente."
            : message}</p>
      {status !== "PAID" && (
        <p>
          A confirmação é automática; não é necessário enviar comprovante.
          {hasError ? " Estamos tentando consultar novamente." : ""}
        </p>
      )}
    </div>
  );
}
