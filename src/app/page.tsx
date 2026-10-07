import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/plans";
import FixedPixPayment from "@/app/FixedPixPayment";
import {
  activeProducts,
  offerProducts,
  productCategories,
  type Product,
} from "@/lib/products";

const whatsappNumber = "5588999412505";
const categoryIcons = {
  Streaming: "📺",
  Jogos: "🎮",
  Recargas: "📱",
  "Gift Cards": "🎁",
  "Produtos digitais": "💻",
} satisfies Record<(typeof productCategories)[number], string>;

const deliveryOptions = [
  {
    icon: "⚡",
    title: "Códigos e recargas",
    description: "Entrega imediata após a confirmação do pagamento.",
  },
  {
    icon: "📩",
    title: "Contas e acessos digitais",
    description: "Receba no WhatsApp e no e-mail em até 6 horas.",
  },
  {
    icon: "💬",
    title: "Precisa de ajuda?",
    description: "Nosso atendimento está disponível pelo WhatsApp.",
  },
];

const trustItems = [
  { icon: "✓", label: "Pagamento seguro" },
  { icon: "◌", label: "Atendimento pelo WhatsApp" },
  { icon: "↗", label: "Entrega digital" },
  { icon: "♡", label: "Suporte ao cliente" },
];

const questions = [
  {
    question: "Quando recebo meu produto?",
    answer:
      "Contas e acessos digitais são enviados pelo WhatsApp e e-mail em até 6 horas. Códigos e recargas são enviados imediatamente após a confirmação do pagamento.",
  },
  {
    question: "Como faço para comprar?",
    answer: "Escolha o produto, clique em comprar e siga o processo de pagamento.",
  },
  {
    question: "Posso falar com vocês antes de comprar?",
    answer: "Sim. Nosso atendimento está disponível pelo WhatsApp.",
  },
];

function whatsappLink(message: string) {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path
        d="M4 10h12m-5-5 5 5-5 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path
        d="M20.1 11.7a8.1 8.1 0 0 1-11.9 7.2L4 20l1.3-4.1a8.1 8.1 0 1 1 14.8-4.2Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M9 8.5c.2-.4.4-.4.7-.4h.4c.2 0 .3.1.5.4l.7 1.7c.1.2.1.4-.1.5l-.5.7c-.1.2-.1.3 0 .5.4.6.9 1.1 1.5 1.5.2.1.4.1.5 0l.7-.5c.2-.1.3-.2.5-.1l1.7.7c.2.1.3.2.3.5v.4c0 .3-.1.5-.4.7-.7.4-1.6.5-2.6.2-1.1-.3-2.3-1.1-3.3-2.1-1-1-1.8-2.2-2.1-3.3-.3-1-.2-1.9.2-2.6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ProductCard({
  product,
  featured = false,
}: {
  product: Product;
  featured?: boolean;
}) {
  return (
    <article className={`shop-product-card${featured ? " is-featured" : ""}`}>
      <div className="shop-product-image">
        <Image
          src={product.image}
          alt={`Imagem do produto ${product.name}`}
          fill
          sizes="(max-width: 700px) 100vw, (max-width: 1050px) 50vw, 380px"
          quality={90}
        />
        {product.badge && <span className="shop-product-badge">{product.badge}</span>}
      </div>
      <div className="shop-product-info">
        <span className="shop-product-category">{product.category}</span>
        <h3>{product.name}</h3>
        <p className="shop-product-description">{product.description}</p>
        <div className="shop-product-delivery">
          <span>{product.deliveryType}</span>
          <span>{product.deliveryTime}</span>
        </div>
        <div className="shop-product-prices">
          <div className="shop-regular-price">
            <span>Preço normal</span>
            <del>{formatPrice(product.regularPrice)}</del>
          </div>
          <span className="shop-pix-label">No Pix</span>
          <strong>{formatPrice(product.pixPrice)}</strong>
        </div>
        <FixedPixPayment
          productName={product.name}
          pixCode={product.pixCode}
          pixPrice={product.pixPrice}
        />
        <a
        className="shop-product-whatsapp"
        href={whatsappLink(product.whatsappMessage)}
        target="_blank"
        rel="noreferrer"
        >
        Falar no WhatsApp
        </a>
      </div>
    </article>
  );
}

export default function Home() {
  return (
    <div className="shop-home">
      <div className="shop-topbar">
        <div className="shop-shell shop-topbar-inner">
          <span>Produtos digitais com atendimento direto</span>
          <a href={whatsappLink("Olá! Gostaria de falar com a Caio Soluções.")}>
            Precisa de ajuda? Fale com a gente
          </a>
        </div>
      </div>

      <header className="shop-header">
        <div className="shop-shell shop-header-inner">
          <Link className="shop-brand" href="/" aria-label="Caio Soluções, início">
            <span className="shop-brand-mark" aria-hidden="true">cs</span>
            <span>Caio Soluções</span>
          </Link>
          <nav className="shop-nav" aria-label="Navegação principal">
            <Link href="/">Início</Link>
            <a href="#produtos">Produtos</a>
            <a href="#ofertas">Ofertas</a>
          </nav>
          <a
            className="shop-header-whatsapp"
            href={whatsappLink("Olá! Gostaria de falar com a Caio Soluções.")}
            target="_blank"
            rel="noreferrer"
          >
            <WhatsAppIcon />
            <span>WhatsApp</span>
          </a>
        </div>
      </header>

      <main>
        <section className="shop-hero" id="inicio">
          <div className="shop-shell shop-hero-inner">
            <div className="shop-hero-copy">
              <span className="shop-eyebrow">Caio Soluções · Loja digital</span>
              <h1>Produtos digitais, do seu jeito.</h1>
              <p>
                Compre com facilidade e receba diretamente no WhatsApp e
                e-mail.
              </p>
              <a className="shop-hero-button" href="#produtos">
                Ver produtos <ArrowIcon />
              </a>
              <a
                className="shop-hero-whatsapp"
                href={whatsappLink("Olá! Gostaria de falar com a Caio Soluções.")}
                target="_blank"
                rel="noreferrer"
              >
                Falar no WhatsApp
              </a>
            </div>
            <div className="shop-delivery-indicators">
              <article>
                <span>ENTREGA IMEDIATA</span>
                <p>
                  Códigos e recargas são enviados imediatamente após a
                  confirmação do pagamento.
                </p>
              </article>
              <article>
                <span>ATÉ 6 HORAS</span>
                <p>
                  Contas e acessos digitais são enviados pelo WhatsApp e e-mail
                  em até 6 horas.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="shop-categories shop-shell" aria-labelledby="category-title">
          <div className="shop-section-heading shop-category-heading">
            <div>
              <span className="shop-eyebrow">Explore a loja</span>
              <h2 id="category-title">Categorias</h2>
            </div>
          </div>
          <div className="shop-category-grid">
            {productCategories.map((category) => (
              <a
                className="shop-category-tile"
                href="#produtos"
                key={category}
              >
                <span aria-hidden="true">{categoryIcons[category]}</span>
                <strong>{category}</strong>
                <ArrowIcon />
              </a>
            ))}
          </div>
        </section>

        <section className="shop-catalog shop-shell" id="produtos">
          <div className="shop-section-heading">
            <div>
              <span className="shop-eyebrow">Seleção Caio Soluções</span>
              <h2>Produtos em destaque</h2>
            </div>
            <p>Confira os produtos disponíveis e fale com a gente para comprar.</p>
          </div>
          <div className="shop-product-grid">
            {activeProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        <section className="shop-delivery-section">
          <div className="shop-shell">
            <div className="shop-section-heading">
              <div>
                <span className="shop-eyebrow">Entrega digital</span>
                <h2>Como você recebe seu produto?</h2>
              </div>
            </div>
            <div className="shop-delivery-grid">
              {deliveryOptions.map((option) => (
                <article className="shop-delivery-card" key={option.title}>
                  <span aria-hidden="true">{option.icon}</span>
                  <h3>{option.title}</h3>
                  <p>{option.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="shop-offers" id="ofertas">
          <div className="shop-shell">
            <div className="shop-section-heading">
              <div>
                <span className="shop-eyebrow">Preços especiais no Pix</span>
                <h2>Ofertas em destaque</h2>
              </div>
              <p>Veja os produtos com preço promocional para pagamento via Pix.</p>
            </div>
            <div className="shop-product-grid">
              {offerProducts.map((product) => (
                <ProductCard key={product.id} product={product} featured />
              ))}
            </div>
          </div>
        </section>

        <section className="shop-trust-section">
          <div className="shop-shell shop-trust-inner">
            <div>
              <span className="shop-eyebrow">Caio Soluções</span>
              <h2>Compra simples e atendimento direto</h2>
            </div>
            <div className="shop-trust-grid">
              {trustItems.map((item) => (
                <div className="shop-trust-item" key={item.label}>
                  <span aria-hidden="true">{item.icon}</span>
                  <strong>{item.label}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="shop-faq-section">
          <div className="shop-shell shop-faq-layout">
            <div className="shop-faq-intro">
              <span className="shop-eyebrow">Dúvidas</span>
              <h2>Perguntas frequentes</h2>
            </div>
            <div className="shop-faq-list">
              {questions.map((item) => (
                <details key={item.question}>
                  <summary>{item.question}<span aria-hidden="true">+</span></summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="shop-footer">
        <div className="shop-shell">
          <div className="shop-footer-main">
            <div>
              <Link className="shop-brand shop-footer-brand" href="/">
                <span className="shop-brand-mark" aria-hidden="true">cs</span>
                <span>Caio Soluções</span>
              </Link>
              <p>Atendimento próximo, do nosso jeito.</p>
            </div>
            <div className="shop-footer-column">
              <strong>Fale com a gente</strong>
              <a
                href={whatsappLink("Olá! Gostaria de falar com a Caio Soluções.")}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp: (88) 99941-2505
              </a>
              <a href="mailto:caio.filho.amoim.50@gmail.com">
                caio.filho.amoim.50@gmail.com
              </a>
            </div>
            <div className="shop-footer-column">
              <strong>Onde estamos</strong>
              <span>Valdir Amorim</span>
              <span>Tauá – Ceará – Brasil</span>
            </div>
          </div>
          <div className="shop-footer-bottom">
            <span>© 2026 Caio Soluções</span>
            <a href="#inicio">Voltar ao início ↑</a>
          </div>
        </div>
      </footer>

      <div className="shop-floating-whatsapp">
        <span>Estou online 👋</span>
        <a
          href="https://wa.me/5588999412505"
          target="_blank"
          rel="noreferrer"
          aria-label="Conversar com a Caio Soluções pelo WhatsApp"
        >
          <WhatsAppIcon />
        </a>
      </div>
    </div>
  );
}
