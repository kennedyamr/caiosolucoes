"use client";

import { useState } from "react";
import { formatPrice, plans, type PlanSlug } from "@/lib/plans";

type PaymentMethod = "PIX" | "CREDIT_CARD";

type PagBankCheckoutButtonProps = {
  plan: PlanSlug;
  className: string;
  children: React.ReactNode;
};

function getError(result: unknown) {
  return typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof result.error === "string"
    ? result.error
    : "Não foi possível iniciar o pagamento. Tente novamente.";
}

export default function PagBankCheckoutButton({
  plan,
  className,
  children,
}: PagBankCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isChoosingPayment, setIsChoosingPayment] = useState(false);
  const [error, setError] = useState("");

  async function startCheckout(method: PaymentMethod) {
    if (isLoading) return;
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/pagbank/checkout/${plan}?method=${method}`,
        { method: "POST" }
      );
      const result: unknown = await response.json();
      if (
        !response.ok ||
        typeof result !== "object" ||
        result === null ||
        !("checkoutUrl" in result) ||
        typeof result.checkoutUrl !== "string" ||
        !("checkoutId" in result) ||
        typeof result.checkoutId !== "string" ||
        !/^CHEC_[A-Za-z0-9-]{1,100}$/.test(result.checkoutId) ||
        !("referenceId" in result) ||
        typeof result.referenceId !== "string"
      ) {
        throw new Error(getError(result));
      }

      const checkoutUrl = new URL(result.checkoutUrl);
      if (
        checkoutUrl.protocol !== "https:" ||
        !["pagamento.pagbank.com.br", "checkout.pagbank.com.br"].includes(
          checkoutUrl.hostname
        )
      ) {
        throw new Error("O PagBank retornou um link de pagamento inválido.");
      }
      window.sessionStorage.setItem(
        `pagbank-checkout:${result.referenceId}`,
        JSON.stringify({
          checkoutId: result.checkoutId,
          referenceId: result.referenceId,
        })
      );
      window.location.assign(checkoutUrl.toString());
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Não foi possível iniciar o pagamento. Tente novamente."
      );
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        className={className}
        disabled={isLoading}
        aria-expanded={isChoosingPayment}
        aria-controls={`pagbank-methods-${plan}`}
        onClick={() => setIsChoosingPayment((choosing) => !choosing)}
        type="button"
      >
        {isLoading ? "Conectando ao PagBank..." : children}
      </button>
      {isChoosingPayment && (
        <div
          className="pagbank-method-picker"
          id={`pagbank-methods-${plan}`}
          role="group"
          aria-label="Escolha a forma de pagamento"
        >
          <p>Escolha como deseja pagar:</p>
          <div className="pagbank-method-options">
            <button
              className="pagbank-method-option"
              disabled={isLoading}
              onClick={() => startCheckout("PIX")}
              type="button"
            >
              <span>Pix</span>
              <strong>{formatPrice(plans[plan].pixPriceInCents)}</strong>
              <small>Preço com desconto</small>
            </button>
            <button
              className="pagbank-method-option"
              disabled={isLoading}
              onClick={() => startCheckout("CREDIT_CARD")}
              type="button"
            >
              <span>Cartão de crédito</span>
              <strong>{formatPrice(plans[plan].cardPriceInCents)}</strong>
              <small>Preço normal</small>
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="checkout-feedback checkout-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
