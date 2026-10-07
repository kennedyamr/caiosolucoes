import { plans, type PlanSlug } from "@/lib/plans";

export type ProductCategory =
  | "Jogos"
  | "Streaming"
  | "Recargas"
  | "Gift Cards"
  | "Produtos digitais";

export type Product = {
  id: string;
  planSlug: PlanSlug;
  name: string;
  description: string;
  category: ProductCategory;
  image: string;
  regularPrice: number;
  pixPrice: number;
  badge: string | null;
  whatsappMessage: string;
  type: "digital";
  deliveryType: "Conta digital";
  deliveryTime: "Até 6 horas";
  active: boolean;
};

const planProducts: Record<PlanSlug, Product> = {
  mensal: {
    id: "unitv-mensal",
    planSlug: "mensal",
    name: "UniTV Mensal",
    description: "Acesso digital UniTV pelo período de 1 mês.",
    category: "Streaming",
    image: "/images/unitv-mensal.webp",
    regularPrice: plans.mensal.cardPriceInCents,
    pixPrice: plans.mensal.pixPriceInCents,
    badge: "MAIS VENDIDO",
    whatsappMessage:
      "Olá! Quero comprar o plano mensal da Caio Soluções por R$ 24,90.",
    type: "digital",
    deliveryType: "Conta digital",
    deliveryTime: "Até 6 horas",
    active: true,
  },
  anual: {
    id: "unitv-anual",
    planSlug: "anual",
    name: "UniTV Anual",
    description: "Acesso digital UniTV pelo período de 1 ano.",
    category: "Streaming",
    image: "/images/unitv-anual.webp",
    regularPrice: plans.anual.cardPriceInCents,
    pixPrice: plans.anual.pixPriceInCents,
    badge: "MELHOR CUSTO-BENEFÍCIO",
    whatsappMessage:
      "Olá! Quero comprar o plano anual da Caio Soluções por R$ 179,90.",
    type: "digital",
    deliveryType: "Conta digital",
    deliveryTime: "Até 6 horas",
    active: true,
  },
};

export const products: Product[] = [
  planProducts.mensal,
  planProducts.anual,
];

export const productCategories: ProductCategory[] = [
  "Streaming",
  "Jogos",
  "Recargas",
  "Gift Cards",
  "Produtos digitais",
];

export const activeProducts = products.filter((product) => product.active);

export const offerProducts = activeProducts.filter(
  (product) =>
    product.badge !== null || product.pixPrice < product.regularPrice
);
