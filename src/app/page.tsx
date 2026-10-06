import Link from "next/link";
import Image from "next/image";
import { formatPrice, plans } from "@/lib/plans";

const whatsappNumber = "5588999412505";

function whatsappLink(message: string) {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 20 20"
      className="check-icon"
    >
      <path
        d="m5 10 3.2 3.2L15.5 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 20 20"
      className="arrow-icon"
    >
      <path
        d="M4.2 10h11.6m-4.8-4.8 4.8 4.8-4.8 4.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

const benefits = [
  {
    number: "01",
    title: "Atendimento de verdade",
    description:
      "Tire suas dúvidas diretamente com a gente pelo WhatsApp, antes de escolher.",
  },
  {
    number: "02",
    title: "Desconto pagando no Pix",
    description:
      "Os dois planos têm um valor especial para quem prefere pagar via Pix.",
  },
  {
    number: "03",
    title: "Receba sem complicação",
    description:
      "A entrega é feita rapidamente pelo WhatsApp e também pelo seu e-mail.",
  },
];

const questions = [
  {
    question: "Como faço para comprar?",
    answer:
      "Escolha um dos planos e clique em comprar. Você vai falar com a gente pelo WhatsApp para combinar os próximos passos.",
  },
  {
    question: "Como funciona o preço para Pix?",
    answer:
      "Cada plano tem um valor padrão e um valor com desconto para pagamento via Pix. Os preços estão indicados nos cartões acima.",
  },
  {
    question: "Como vou receber meu pedido?",
    answer:
      "A entrega é feita rapidamente pelo WhatsApp e pelo e-mail informado no atendimento.",
  },
  {
    question: "Quero saber mais antes de comprar. O que faço?",
    answer:
      "É só chamar pelo WhatsApp. A gente pode esclarecer suas dúvidas antes de você escolher um plano.",
  },
];

export default function Home() {
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#inicio" aria-label="Caio Soluções, início">
            <span className="brand-mark" aria-hidden="true">
              cs
            </span>
            <span>Caio Soluções</span>
          </a>

          <nav className="main-nav" aria-label="Navegação principal">
            <a href="#planos">Planos</a>
            <a href="#vantagens">Vantagens</a>
            <a href="#duvidas">Dúvidas</a>
          </nav>

          <a
            className="button button-whatsapp header-cta"
            href={whatsappLink("Olá! Gostaria de falar com a Caio Soluções.")}
            target="_blank"
            rel="noreferrer"
          >
            <span className="whatsapp-symbol" aria-hidden="true">
              ↗
            </span>
            Fale pelo WhatsApp
          </a>
        </div>
      </header>

      <main id="inicio">
        <section className="hero">
          <div className="hero-inner page-width">
            <div className="hero-copy">
              <span className="eyebrow">
                <span className="eyebrow-dot" />
                Atendimento próximo, compra simples
              </span>
              <h1>
                Escolha seu plano.
                <br />
                <span>Conte com a gente.</span>
              </h1>
              <p className="hero-description">
                Planos com preço especial no Pix e atendimento direto pelo
                WhatsApp. Você escolhe, conversa com a gente e recebe com
                praticidade.
              </p>
              <div className="hero-actions">
                <a className="button button-primary" href="#planos">
                  Conheça os planos
                  <ArrowIcon />
                </a>
                <a
                  className="text-link"
                  href={whatsappLink("Olá! Tenho uma dúvida sobre os planos.")}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ficou com dúvida? Fale com a gente
                </a>
              </div>
              <div className="hero-note">
                <span className="note-check">
                  <CheckIcon />
                </span>
                Entrega rápida pelo WhatsApp e e-mail
              </div>
            </div>

            <div className="hero-visual" aria-label="Resumo dos planos">
              <div className="visual-topline">
                <span>Caio Soluções</span>
                <span className="visual-online">
                  <span />
                  Atendimento
                </span>
              </div>
              <div className="visual-content">
                <p className="visual-kicker">Escolha com tranquilidade</p>
                <p className="visual-title">
                  Um plano para
                  <br />
                  o seu momento.
                </p>
                <div className="visual-rule" />
                <div className="visual-plan-row">
                  <span>1 mês</span>
                  <span>{formatPrice(plans.mensal.cardPriceInCents)}</span>
                </div>
                <div className="visual-plan-row visual-plan-highlight">
                  <span>1 ano</span>
                  <span>{formatPrice(plans.anual.pixPriceInCents)} no Pix</span>
                </div>
              </div>
              <div className="visual-stamp">
                <span>Pix</span>
                <strong>preço<br />especial</strong>
              </div>
              <div className="visual-footer">
                <span>Fale com a gente</span>
                <span aria-hidden="true">↗</span>
              </div>
              <span className="visual-decoration decoration-one" />
              <span className="visual-decoration decoration-two" />
            </div>
          </div>
          <div className="hero-bottom page-width">
            <span>Atendimento direto, do primeiro contato à entrega</span>
            <a href="#planos">
              Conheça os valores <span aria-hidden="true">↓</span>
            </a>
          </div>
        </section>

        <section className="plans-section section-padding" id="planos">
          <div className="page-width">
            <div className="section-heading">
              <div>
                <span className="section-eyebrow">Planos e valores</span>
                <h2>Escolha o que combina com você.</h2>
              </div>
              <p>
                Pague como preferir. No Pix, aproveite o valor especial em cada
                plano.
              </p>
            </div>

            <div className="plans-grid">
              <article className="plan-card">
                <Image
                  className="plan-card-image"
                  src={`/${plans.mensal.imageFile}`}
                  alt="Banner do plano mensal Caio Soluções"
                  width={1536}
                  height={1024}
                  sizes="(max-width: 680px) 100vw, 50vw"
                  quality={90}
                />
                <div className="plan-card-top">
                  <span className="plan-label">Para começar</span>
                  <span className="plan-period">1 mês</span>
                </div>
                <div className="plan-price-block">
                  <span className="price-caption">Valor do plano</span>
                  <p className="plan-price">
                    {formatPrice(plans.mensal.cardPriceInCents)}
                  </p>
                </div>
                <div className="pix-price">
                  <span className="pix-icon" aria-hidden="true">P</span>
                  <span>
                    <span className="pix-caption">No Pix</span>
                    <strong>{formatPrice(plans.mensal.pixPriceInCents)}</strong>
                  </span>
                  <span className="pix-discount">Melhor preço</span>
                </div>
                <Link
                  className="button button-outline plan-button"
                  href="/checkout/mensal"
                >
                  Comprar pelo site
                  <ArrowIcon />
                </Link>
                <a
                  className="button button-primary plan-button plan-whatsapp-button"
                  href={whatsappLink("Olá! Quero comprar o plano de 1 mês.")}
                  target="_blank"
                  rel="noreferrer"
                >
                  Comprar pelo WhatsApp
                  <ArrowIcon />
                </a>
              </article>

              <article className="plan-card plan-card-featured">
                <Image
                  className="plan-card-image"
                  src={`/${plans.anual.imageFile}`}
                  alt="Banner do plano anual Caio Soluções"
                  width={1264}
                  height={843}
                  sizes="(max-width: 680px) 100vw, 50vw"
                  quality={90}
                />
                <span className="popular-badge">MAIS ECONÔMICO</span>
                <div className="plan-card-top">
                  <span className="plan-label">Para aproveitar mais</span>
                  <span className="plan-period">1 ano</span>
                </div>
                <div className="plan-price-block">
                  <span className="price-caption">Valor do plano</span>
                  <p className="plan-price">
                    {formatPrice(plans.anual.cardPriceInCents)}
                  </p>
                </div>
                <div className="pix-price">
                  <span className="pix-icon" aria-hidden="true">P</span>
                  <span>
                    <span className="pix-caption">No Pix</span>
                    <strong>{formatPrice(plans.anual.pixPriceInCents)}</strong>
                  </span>
                  <span className="pix-discount">Melhor preço</span>
                </div>
                <Link
                  className="button button-outline plan-button"
                  href="/checkout/anual"
                >
                  Comprar pelo site
                  <ArrowIcon />
                </Link>
                <a
                  className="button button-primary plan-button plan-whatsapp-button"
                  href={whatsappLink("Olá! Quero comprar o plano de 1 ano.")}
                  target="_blank"
                  rel="noreferrer"
                >
                  Comprar pelo WhatsApp
                  <ArrowIcon />
                </a>
              </article>
            </div>
            <p className="plans-disclaimer">
              Quer confirmar algum detalhe antes? Chame a gente pelo WhatsApp
              antes de realizar o pagamento.
            </p>
          </div>
        </section>

        <section className="benefits-section section-padding" id="vantagens">
          <div className="page-width">
            <div className="benefits-intro">
              <span className="section-eyebrow">Uma experiência simples</span>
              <h2>Do primeiro oi até a entrega.</h2>
              <p>
                Um atendimento próximo para você escolher com clareza e receber
                com tranquilidade.
              </p>
            </div>
            <div className="benefits-grid">
              {benefits.map((benefit) => (
                <article className="benefit-item" key={benefit.number}>
                  <span className="benefit-number">{benefit.number}</span>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.description}</p>
                </article>
              ))}
            </div>
            <div className="delivery-banner">
              <div className="delivery-icon" aria-hidden="true">
                <svg fill="none" viewBox="0 0 28 28">
                  <path
                    d="M4.5 7.5h19v13h-19zM5 8l9 7 9-7"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M20.5 3.5v5m-2.5-2.5h5"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.6"
                  />
                </svg>
              </div>
              <div>
                <strong>Receba pelo WhatsApp e e-mail</strong>
                <p>Entrega rápida, direto nos canais combinados com você.</p>
              </div>
              <a
                className="delivery-link"
                href={whatsappLink("Olá! Gostaria de saber mais sobre a entrega.")}
                target="_blank"
                rel="noreferrer"
              >
                Fale com a gente <ArrowIcon />
              </a>
            </div>
          </div>
        </section>

        <section className="faq-section section-padding" id="duvidas">
          <div className="page-width faq-layout">
            <div className="faq-intro">
              <span className="section-eyebrow">Perguntas frequentes</span>
              <h2>Ficou alguma dúvida?</h2>
              <p>
                Se precisar, nosso atendimento está a uma mensagem de distância.
              </p>
              <a
                className="button button-primary faq-cta"
                href={whatsappLink("Olá! Gostaria de tirar uma dúvida.")}
                target="_blank"
                rel="noreferrer"
              >
                Chamar no WhatsApp
                <ArrowIcon />
              </a>
            </div>
            <div className="faq-list">
              {questions.map((item) => (
                <details className="faq-item" key={item.question}>
                  <summary>
                    {item.question}
                    <span className="faq-toggle" aria-hidden="true" />
                  </summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="page-width">
          <div className="footer-main">
            <div className="footer-brand">
              <a className="brand footer-logo" href="#inicio">
                <span className="brand-mark" aria-hidden="true">
                  cs
                </span>
                <span>Caio Soluções</span>
              </a>
              <p>Atendimento próximo, do nosso jeito.</p>
            </div>
            <div className="footer-contact">
              <span className="footer-heading">Fale com a gente</span>
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
            <div className="footer-location">
              <span className="footer-heading">Onde estamos</span>
              <span>Valdir Amorim</span>
              <span>Tauá – Ceará – Brasil</span>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Caio Soluções</span>
            <a href="#inicio">Voltar ao início ↑</a>
          </div>
        </div>
      </footer>

      <div className="floating-whatsapp">
        <span className="floating-whatsapp-message">Estou online 👋</span>
        <a
          className="floating-whatsapp-button"
          href="https://wa.me/5588999412505"
          target="_blank"
          rel="noreferrer"
          aria-label="Conversar com a Caio Soluções pelo WhatsApp"
        >
          <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
            <path
              d="M26.4 15.6a10.4 10.4 0 0 1-15.3 9.2L5 26.4l1.7-5.9a10.4 10.4 0 1 1 19.7-4.9Z"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="2"
            />
            <path
              d="M12 11.3c.3-.6.6-.6 1-.6h.6c.2 0 .5.1.7.5l1 2.4c.1.3.1.5-.1.7l-.8 1c-.2.2-.2.4 0 .7.5.9 1.3 1.7 2.2 2.2.3.2.5.2.7 0l1-.8c.2-.2.5-.2.7-.1l2.4 1c.3.1.5.4.5.7v.6c0 .4-.1.7-.6 1-1 .6-2.3.8-3.8.3-1.6-.5-3.3-1.6-4.7-3-1.4-1.4-2.5-3.1-3-4.7-.5-1.5-.3-2.8.3-3.8Z"
              fill="currentColor"
            />
          </svg>
        </a>
      </div>
    </>
  );
}
