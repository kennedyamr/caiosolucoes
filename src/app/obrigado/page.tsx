import Link from "next/link";
import { plans, isPlanSlug } from "@/lib/plans";
import { parsePagBankReference } from "@/lib/pagbank-payment";
import PaymentConfirmation from "@/app/obrigado/PaymentConfirmation";

const whatsappNumber = "5588999412505";

export default async function ObrigadoPage({
  searchParams,
}: PageProps<"/obrigado">) {
  const { plano, pedido } = await searchParams;
  const parsedReference = parsePagBankReference(pedido);
  const selectedPlan = parsedReference
    ? plans[parsedReference.plan].name
    : typeof plano === "string" && isPlanSlug(plano)
      ? plans[plano].name
      : null;
  const referenceId = parsedReference?.referenceId ?? null;
  const message = selectedPlan
    ? `Olá! Tenho uma dúvida sobre meu pedido do ${selectedPlan}.`
    : "Olá! Tenho uma dúvida sobre meu pedido feito pelo site.";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  return (
    <main className="checkout-page">
      <div className="checkout-card thank-you-card">
        <span className="section-eyebrow">Caio Soluções</span>
        <h1>Obrigado pelo seu pedido!</h1>
        {selectedPlan && (
          <p className="thank-you-plan">Plano selecionado: {selectedPlan}</p>
        )}
        <PaymentConfirmation referenceId={referenceId} />
        <a
          className="button button-primary checkout-action-button"
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
        >
          Falar com atendimento pelo WhatsApp
        </a>
        <Link className="checkout-back-button" href="/">
          Voltar para a loja
        </Link>
      </div>
    </main>
  );
}
