export const plans = {
  mensal: {
    name: "Plano de 1 mês",
    checkoutItemName: "Plano Mensal",
    cardPriceInCents: 2490,
    pixPriceInCents: 2290,
    imageFile: "plano-mensal.jpg",
  },
  anual: {
    name: "Plano de 1 ano",
    checkoutItemName: "Plano Anual",
    cardPriceInCents: 17990,
    pixPriceInCents: 16990,
    imageFile: "plano-anual.jpg",
  },
} as const;

export type PlanSlug = keyof typeof plans;

export function isPlanSlug(slug: string): slug is PlanSlug {
  return Object.hasOwn(plans, slug);
}

export function formatPrice(priceInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(priceInCents / 100);
}
