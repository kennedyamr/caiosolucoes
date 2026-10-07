"use client";

import Image from "next/image";
import { useState } from "react";
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
  const [copyStatus, setCopyStatus] = useState("");
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&format=svg&data=${encodeURIComponent(pixCode)}`;

  async function copyPixCode() {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopyStatus("Código Pix copiado.");
    } catch {
      setCopyStatus("Selecione o código acima para copiá-lo manualmente.");
    }
  }

  return (
    <section className="shop-fixed-pix" aria-label={`Pagamento Pix: ${productName}`}>
      <div className="shop-fixed-pix-heading">
        <div>
          <span>Pagar com Pix</span>
          <strong>{productName}</strong>
        </div>
        <strong className="shop-fixed-pix-price">{formatPrice(pixPrice)}</strong>
      </div>
      <div className="shop-fixed-pix-body">
        <Image
          className="shop-fixed-pix-qr"
          src={qrCodeUrl}
          alt={`QR Code Pix para ${productName}, no valor de ${formatPrice(pixPrice)}`}
          width={160}
          height={160}
          unoptimized
        />
        <p>Escaneie o QR Code ou copie o código Pix.</p>
      </div>
      <label className="shop-fixed-pix-label" htmlFor={`pix-code-${productName}`}>
        Pix Copia e Cola
      </label>
      <textarea
        id={`pix-code-${productName}`}
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
        Copiar código Pix
      </button>
      <p className="shop-fixed-pix-status" aria-live="polite">
        {copyStatus}
      </p>
    </section>
  );
}
