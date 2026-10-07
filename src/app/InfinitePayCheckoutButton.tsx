"use client";

import { useState } from "react";
import { parseInfinitePayCheckoutUrl } from "@/lib/infinitepay-url";

export default function InfinitePayCheckoutButton({
  plan,
}: {
  plan: "mensal" | "anual";
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function startCheckout() {
    if (isLoading) return;
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/infinitepay/checkout/${plan}`, {
        method: "POST",
      });
      const result: unknown = await response.json();
      if (
        !response.ok ||
        typeof result !== "object" ||
        result === null ||
        !("checkoutUrl" in result) ||
        typeof result.checkoutUrl !== "string"
      ) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Não foi possível iniciar o checkout. Tente novamente.";
        throw new Error(message);
      }

      const checkoutUrl = parseInfinitePayCheckoutUrl(result.checkoutUrl);
      if (!checkoutUrl) {
        throw new Error("A InfinitePay retornou um link de checkout inválido.");
      }

      window.location.assign(checkoutUrl.toString());
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Não foi possível iniciar o checkout. Tente novamente."
      );
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        className="shop-buy-button"
        disabled={isLoading}
        onClick={startCheckout}
        type="button"
      >
        {isLoading ? "Conectando..." : "Pagar agora"}
      </button>
      {error && (
        <p className="shop-checkout-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
