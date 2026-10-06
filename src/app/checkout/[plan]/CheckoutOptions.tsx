"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { PlanSlug } from "@/lib/plans";

type CheckoutOptionsProps = {
  plan: PlanSlug;
  planName: string;
  cardPrice: string;
  pixPrice: string;
};

type PixPayment = {
  orderId: string;
  qrCode: string;
  copyPaste: string;
  amountCents: number;
  expirationDate: string | null;
};

type PixPaymentStatus =
  | "CREATING"
  | "PENDING"
  | "PAID"
  | "CANCELED"
  | "EXPIRED"
  | "REFUNDED"
  | "FAILED";

function isPixPayment(value: unknown): value is PixPayment {
  return (
    typeof value === "object" &&
    value !== null &&
    "orderId" in value &&
    typeof value.orderId === "string" &&
    "qrCode" in value &&
    typeof value.qrCode === "string" &&
    value.qrCode.startsWith("data:image/png;base64,") &&
    "copyPaste" in value &&
    typeof value.copyPaste === "string" &&
    "amountCents" in value &&
    typeof value.amountCents === "number" &&
    "expirationDate" in value &&
    (value.expirationDate === null || typeof value.expirationDate === "string")
  );
}

function getApiError(result: unknown, fallback: string) {
  if (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof result.error === "string"
  ) {
    return result.error;
  }
  return fallback;
}

export default function CheckoutOptions({
  plan,
  planName,
  cardPrice,
  pixPrice,
}: CheckoutOptionsProps) {
  const router = useRouter();
  const [pixName, setPixName] = useState("");
  const [pixEmail, setPixEmail] = useState("");
  const [pixCpf, setPixCpf] = useState("");
  const [pixError, setPixError] = useState("");
  const [pixFeedback, setPixFeedback] = useState("");
  const [pixPayment, setPixPayment] = useState<PixPayment | null>(null);
  const [pixStatus, setPixStatus] = useState<PixPaymentStatus>("CREATING");
  const [isCreatingPix, setIsCreatingPix] = useState(false);
  const [cardError, setCardError] = useState("");
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);

  useEffect(() => {
    if (!pixPayment) return;
    const orderId = pixPayment.orderId;

    let isActive = true;
    let timer: ReturnType<typeof setTimeout>;

    async function checkPaymentStatus() {
      try {
        const response = await fetch(
          `/api/pix/status/${encodeURIComponent(orderId)}`,
          { cache: "no-store" }
        );
        const result: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            getApiError(result, "Não foi possível consultar o pagamento.")
          );
        }

        if (
          typeof result !== "object" ||
          result === null ||
          !("status" in result) ||
          typeof result.status !== "string"
        ) {
          throw new Error("O servidor retornou um status de pagamento inválido.");
        }

        const status = result.status as PixPaymentStatus;
        if (
          ![
            "CREATING",
            "PENDING",
            "PAID",
            "CANCELED",
            "EXPIRED",
            "REFUNDED",
            "FAILED",
          ].includes(status)
        ) {
          throw new Error("O servidor retornou um status de pagamento inválido.");
        }

        if (!isActive) return;
        setPixStatus(status);
        if (status === "PAID") {
          timer = setTimeout(() => {
            router.replace(`/obrigado?plano=${plan}&origem=pix`);
          }, 1500);
          return;
        }
      } catch (error) {
        if (isActive) {
          setPixFeedback(
            error instanceof Error
              ? error.message
              : "Falha ao consultar o pagamento. Tentaremos novamente."
          );
        }
      }

      if (isActive) {
        timer = setTimeout(checkPaymentStatus, 8000);
      }
    }

    void checkPaymentStatus();
    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [pixPayment, plan, router]);

  async function copyPixCode() {
    try {
      if (!pixPayment) return;
      await navigator.clipboard.writeText(pixPayment.copyPaste);
      setPixFeedback("Código Pix copiado. Abra o aplicativo do seu banco para pagar.");
    } catch {
      setPixFeedback(
        "Não foi possível copiar automaticamente. Selecione e copie o código Pix acima."
      );
    }
  }

  async function createPixPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPixError("");
    setPixFeedback("");
    setIsCreatingPix(true);

    try {
      const response = await fetch("/api/pix", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          plan,
          name: pixName,
          email: pixEmail,
          cpf: pixCpf,
        }),
      });
      let result: unknown = await response.json();

      if (!response.ok) {
        if (
          typeof result === "object" &&
          result !== null &&
          "orderId" in result &&
          typeof result.orderId === "string"
        ) {
          const recoveryResponse = await fetch(
            `/api/pix/status/${encodeURIComponent(result.orderId)}`,
            { cache: "no-store" }
          );
          const recovered: unknown = await recoveryResponse.json();
          if (
            recoveryResponse.ok &&
            isPixPayment(recovered) &&
            "status" in recovered &&
            typeof recovered.status === "string"
          ) {
            result = recovered;
            setPixStatus(recovered.status as PixPaymentStatus);
          } else {
            throw new Error(
              getApiError(result, "Não foi possível gerar a cobrança Pix.")
            );
          }
        } else {
          throw new Error(
            getApiError(result, "Não foi possível gerar a cobrança Pix.")
          );
        }
      }
      if (!isPixPayment(result)) {
        throw new Error("O servidor retornou dados de pagamento inválidos.");
      }
      if (
        ![
          "CREATING",
          "PENDING",
          "PAID",
          "CANCELED",
          "EXPIRED",
          "REFUNDED",
          "FAILED",
        ].includes(
          "status" in result && typeof result.status === "string"
            ? result.status
            : "PENDING"
        )
      ) {
        throw new Error("O servidor retornou um status de pagamento inválido.");
      }

      setPixPayment({
        orderId: result.orderId,
        qrCode: result.qrCode,
        copyPaste: result.copyPaste,
        amountCents: result.amountCents,
        expirationDate: result.expirationDate,
      });
      if ("status" in result && typeof result.status === "string") {
        setPixStatus(result.status as PixPaymentStatus);
      } else {
        setPixStatus("PENDING");
      }
    } catch (error) {
      setPixError(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar a cobrança Pix. Tente novamente."
      );
    } finally {
      setIsCreatingPix(false);
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
            <span className="section-eyebrow">Pagamento pelo Asaas</span>
            <h2 id="pix-title">Pix — {planName}</h2>
          </div>
          <strong className="checkout-payment-price">{pixPrice}</strong>
        </div>
        {!pixPayment ? (
          <>
            <p className="checkout-section-description">
              Informe seus dados para gerar uma cobrança Pix segura no Asaas.
              Eles serão enviados ao Asaas para cadastrar o pagador.
            </p>
            <form className="pix-customer-form" onSubmit={createPixPayment}>
              <label>
                Nome completo
                <input
                  autoComplete="name"
                  maxLength={100}
                  name="name"
                  onChange={(event) => setPixName(event.target.value)}
                  required
                  value={pixName}
                />
              </label>
              <label>
                E-mail
                <input
                  autoComplete="email"
                  maxLength={254}
                  name="email"
                  onChange={(event) => setPixEmail(event.target.value)}
                  required
                  type="email"
                  value={pixEmail}
                />
              </label>
              <label>
                CPF
                <input
                  autoComplete="off"
                  inputMode="numeric"
                  maxLength={14}
                  name="cpf"
                  onChange={(event) => setPixCpf(event.target.value)}
                  pattern="(\d{3}\.?\d{3}\.?\d{3}-?\d{2})"
                  placeholder="000.000.000-00"
                  required
                  value={pixCpf}
                />
              </label>
              <p className="checkout-feedback checkout-error" role="alert">
                {pixError}
              </p>
              <button
                className="button button-primary checkout-action-button"
                disabled={isCreatingPix}
                type="submit"
              >
                {isCreatingPix ? "Gerando Pix..." : "Gerar cobrança Pix"}
              </button>
            </form>
          </>
        ) : (
          <div className="pix-payment-details">
            <div
              className={`pix-payment-status pix-payment-status-${pixStatus.toLowerCase()}`}
              aria-live="polite"
            >
              <span className="pix-status-indicator" aria-hidden="true" />
              {pixStatus === "PAID"
                ? "Pagamento confirmado ✓"
                : pixStatus === "EXPIRED"
                  ? "Cobrança Pix expirada."
                  : pixStatus === "CANCELED"
                    ? "Cobrança Pix cancelada."
                    : pixStatus === "REFUNDED"
                      ? "Pagamento estornado."
                      : pixStatus === "FAILED"
                        ? "Não foi possível criar a cobrança Pix."
                        : "Aguardando pagamento..."}
            </div>
            <div className="pix-payment-total">
              <span>Valor exato</span>
              <strong>
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(pixPayment.amountCents / 100)}
              </strong>
            </div>
            <div className="pix-qr-frame">
              <Image
                alt="QR Code Pix para pagamento"
                height={260}
                src={pixPayment.qrCode}
                unoptimized
                width={260}
              />
            </div>
            <ol className="pix-payment-instructions">
              <li>Abra o aplicativo do seu banco e escolha pagar com Pix.</li>
              <li>Leia o QR Code ou copie o código Pix abaixo.</li>
              <li>Após o pagamento, a confirmação será verificada automaticamente.</li>
            </ol>
            <label className="checkout-key-label" htmlFor="pix-copy-paste">
              Código Pix copia e cola
            </label>
            <textarea
              className="checkout-pix-key pix-copy-paste"
              id="pix-copy-paste"
              readOnly
              value={pixPayment.copyPaste}
            />
            <button
              className="checkout-back-button checkout-copy-button"
              onClick={copyPixCode}
              type="button"
            >
              Copiar código Pix
            </button>
            <p className="checkout-feedback" aria-live="polite">
              {pixFeedback}
            </p>
            {pixPayment.expirationDate && (
              <p className="checkout-manual-note">
                Válido até{" "}
                {new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(pixPayment.expirationDate))}
              </p>
            )}
            {pixStatus === "PAID" && (
              <p className="checkout-feedback">
                Redirecionando para a página de agradecimento...
              </p>
            )}
            {(pixStatus === "EXPIRED" ||
              pixStatus === "CANCELED" ||
              pixStatus === "REFUNDED" ||
              pixStatus === "FAILED") && (
              <button
                className="checkout-back-button"
                onClick={() => {
                  setPixPayment(null);
                  setPixStatus("CREATING");
                  setPixFeedback("");
                  setPixError("");
                }}
                type="button"
              >
                Gerar outro Pix
              </button>
            )}
          </div>
        )}
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
