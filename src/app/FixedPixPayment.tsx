"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { formatPrice } from "@/lib/plans";

export default function FixedPixPayment({
  productName,
  pixCode,
  pixPrice,
}: {
  productName: string;
  pixCode: string;
  pixPrice: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const dialogTitleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  async function copyPixCode() {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopyStatus("Pix copiado.");
    } catch {
      setCopyStatus("Selecione o código acima para copiá-lo manualmente.");
    }
  }

  return (
    <>
      <button
        className="shop-fixed-pix-trigger"
        type="button"
        onClick={() => {
          setCopyStatus("");
          setIsOpen(true);
        }}
      >
        COMPRAR COM PIX
      </button>
      {isOpen && (
        <div
          className="shop-fixed-pix-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <section
            className="shop-fixed-pix"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
          >
            <div className="shop-fixed-pix-heading">
              <div>
                <span>Pagamento via Pix</span>
                <strong id={dialogTitleId}>{productName}</strong>
              </div>
              <button
                className="shop-fixed-pix-close"
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Fechar pagamento Pix"
              >
                Fechar
              </button>
            </div>
            <strong className="shop-fixed-pix-price">
              {formatPrice(pixPrice)}
            </strong>
            <div className="shop-fixed-pix-body">
              <Image
                className="shop-fixed-pix-qr"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&format=svg&data=${encodeURIComponent(pixCode)}`}
                alt={`QR Code Pix para ${productName}, no valor de ${formatPrice(pixPrice)}`}
                width={160}
                height={160}
                unoptimized
              />
              <p>Escaneie o QR Code ou copie o Pix abaixo.</p>
            </div>
            <label
              className="shop-fixed-pix-label"
              htmlFor={`pix-code-${dialogTitleId}`}
            >
              Pix Copia e Cola
            </label>
            <textarea
              id={`pix-code-${dialogTitleId}`}
              className="shop-fixed-pix-code"
              value={pixCode}
              readOnly
              rows={3}
              onFocus={(event) => event.currentTarget.select()}
              aria-label={`Código Pix Copia e Cola para ${productName}`}
            />
            <button
              className="shop-fixed-pix-copy"
              type="button"
              onClick={copyPixCode}
            >
              Copiar Pix
            </button>
            <p className="shop-fixed-pix-status" aria-live="polite">
              {copyStatus}
            </p>
          </section>
        </div>
      )}
    </>
  );
}
