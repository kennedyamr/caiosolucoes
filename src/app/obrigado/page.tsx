import Link from "next/link";
import { plans, isPlanSlug } from "@/lib/plans";

const whatsappNumber = "5588999412505";

export default async function ObrigadoPage({
  searchParams,
}: PageProps<"/obrigado">) {
  const { plano } = await searchParams;
  const selectedPlan =
    typeof plano === "string" && isPlanSlug(plano) ? plans[plano].name : null;
  const message = selectedPlan
    ? `Olá! Concluí o checkout do ${selectedPlan} e gostaria de enviar a confirmação do meu pedido.`
    : "Olá! Concluí o checkout pelo site e gostaria de enviar a confirmação do meu pedido.";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  return (
    <main className="checkout-page">
      <div className="checkout-card thank-you-card">
        <span className="section-eyebrow">Caio Soluções</span>
        <h1>Obrigado pela sua compra!</h1>
        {selectedPlan && (
          <p className="thank-you-plan">Plano selecionado: {selectedPlan}</p>
        )}
        <p className="thank-you-description">
          Envie uma mensagem pelo WhatsApp para compartilhar a confirmação do
          seu pedido. O retorno do checkout, por si só, não confirma o
          pagamento.
        </p>
        <a
          className="button button-primary checkout-action-button"
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
        >
          Enviar confirmação pelo WhatsApp
        </a>
        <Link className="checkout-back-button" href="/">
          Voltar para a loja
        </Link>
      </div>
    </main>
  );
}
