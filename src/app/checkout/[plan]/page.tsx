import Link from "next/link";
import { notFound } from "next/navigation";
import CheckoutOptions from "./CheckoutOptions";
import { formatPrice, isPlanSlug, plans } from "@/lib/plans";

export function generateStaticParams() {
  return Object.keys(plans).map((plan) => ({ plan }));
}

export default async function CheckoutPage({
  params,
}: PageProps<"/checkout/[plan]">) {
  const { plan: slug } = await params;

  if (!isPlanSlug(slug)) {
    notFound();
  }

  const plan = plans[slug];

  return (
    <main className="checkout-page">
      <div className="checkout-card">
        <Link className="checkout-back-link" href="/#planos">
          ← Voltar aos planos
        </Link>
        <span className="section-eyebrow">Compra pelo site</span>
        <h1>{plan.name}</h1>
        <CheckoutOptions
          plan={slug}
          planName={plan.name}
          cardPrice={formatPrice(plan.cardPriceInCents)}
          pixPrice={formatPrice(plan.pixPriceInCents)}
        />
      </div>
    </main>
  );
}
