"use client";

import { useState } from "react";
import type { PlanSlug } from "@/lib/plans";

const pixKey = "1e3ad67a-8a68-4a0c-91a1-02257ae1b9cb";
const whatsappNumber = "5588999412505";

type CheckoutOptionsProps = {
  plan: PlanSlug;
  planName: string;
  cardPrice: string;
  pixPrice: string;
};

export default function CheckoutOptions({
  plan,
  planName,
  cardPrice,
  pixPrice,
}: CheckoutOptionsProps) {
  const [copyMessage, setCopyMessage] = useState("");
  const [cardError, setCardError] = useState("");
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);

  const pixWhatsappMessage = `Olá! Realizei o Pix referente à compra do ${planName}.`;
  const pixWhatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(pixWhatsappMessage)}`;

  async function copyPixKey() {
    try {
      await navigator.clipboard.writeText(pixKey);
      setCopyMessage("Chave Pix copiada.");
    } catch {
      setCopyMessage(
        "Não foi possível copiar automaticamente. Selecione e copie a chave Pix acima."
      );
    }
  }

  async function createCardCheckout() {
    setCardError("");
    setIsCreatingCheckout(true);

    try {
      const response = await fetch(`/api/checkout/${plan}`, {
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

      const checkoutUrl = new URL(result.checkoutUrl);
      if (
        checkoutUrl.origin !== "https://asaas.com" ||
        checkoutUrl.pathname !== "/checkoutSession/show"
      ) {
        throw new Error("O Asaas retornou um endereço de checkout inválido.");
      }

      window.location.assign(checkoutUrl);
    } catch (error) {
      setCardError(
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar o checkout. Tente novamente."
      );
      setIsCreatingCheckout(false);
    }
  }

  return (
    <div className="checkout-options">
      <section className="checkout-payment-section" aria-labelledby="pix-title">
        <div className="checkout-section-heading">
          <div>
            <span className="section-eyebrow">Pagamento manual</span>
            <h2 id="pix-title">Pagamento via Pix</h2>
          </div>
          <strong className="checkout-payment-price">{pixPrice}</strong>
        </div>
        <p className="checkout-section-description">
          Faça o Pix usando a chave abaixo e depois envie a confirmação pelo
          WhatsApp.
        </p>
        <span className="checkout-key-label">Chave Pix</span>
        <code className="checkout-pix-key">{pixKey}</code>
        <button
          className="checkout-back-button checkout-copy-button"
          type="button"
          onClick={copyPixKey}
        >
          Copiar chave Pix
        </button>
        <p className="checkout-feedback" aria-live="polite">
          {copyMessage}
        </p>
        <p className="checkout-manual-note">
          A confirmação do pagamento é manual. Este site não confirma o Pix
          automaticamente.
        </p>
        <a
          className="button button-primary checkout-action-button"
          href={pixWhatsappUrl}
          target="_blank"
          rel="noreferrer"
        >
          Já fiz o Pix
        </a>
      </section>

      <section
        className="checkout-payment-section checkout-card-payment"
        aria-labelledby="card-title"
      >
        <div className="checkout-section-heading">
          <div>
            <span className="section-eyebrow">Checkout seguro do Asaas</span>
            <h2 id="card-title">Pagamento com cartão</h2>
          </div>
          <strong className="checkout-payment-price">{cardPrice}</strong>
        </div>
        <p className="checkout-section-description">
          O pagamento com cartão será realizado na página hospedada pelo Asaas.
        </p>
        <button
          className="button button-primary checkout-action-button"
          type="button"
          onClick={createCardCheckout}
          disabled={isCreatingCheckout}
        >
          {isCreatingCheckout ? "Conectando ao Asaas..." : "Pagar com cartão"}
        </button>
        <p className="checkout-feedback checkout-error" role="alert">
          {cardError}
        </p>
      </section>
    </div>
  );
}
