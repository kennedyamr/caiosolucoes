This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Integração legada: checkout e webhooks do Asaas

Configure as variáveis do arquivo `.env.example` no ambiente do servidor. `ASAAS_API_KEY` é usada somente pela API server-side; não a renomeie para `NEXT_PUBLIC_*`. `NEXT_PUBLIC_SITE_URL` deve ser a origem pública do site, sem caminho adicional. `ASAAS_API_URL` é opcional e aceita a API de produção ou Sandbox do Asaas; se omitida, usa produção.

O pagamento via Pix coleta nome, e-mail e CPF, cria o pagador e a cobrança no Asaas, e acompanha a confirmação por API e webhook. O QR Code e o código copia e cola são retornados ao cliente; os dados pessoais do pagador são enviados ao Asaas e não ficam armazenados no banco da loja. Para pagamento com cartão, a API cria um Checkout Asaas avulso e redireciona o cliente para a página hospedada pelo Asaas.

Para receber eventos, configure no Asaas o webhook `https://SEU-DOMINIO/api/webhooks/asaas`, usando o valor de `ASAAS_WEBHOOK_TOKEN` como token de autenticação e habilitando `CHECKOUT_CREATED`, `CHECKOUT_PAID`, `CHECKOUT_CANCELED`, `CHECKOUT_EXPIRED`, `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`, `PAYMENT_REFUNDED`, `PAYMENT_PARTIALLY_REFUNDED` e `PAYMENT_RECEIVED_IN_CASH_UNDONE`. A persistência idempotente exige PostgreSQL configurado em `DATABASE_URL`; as tabelas de eventos e status são criadas automaticamente. Os eventos de pagamento e a consulta autenticada à API, não uma URL de retorno, confirmam o Pix.

Esses endpoints Asaas permanecem no projeto para compatibilidade, mas os botões de compra da página inicial usam o checkout PagBank descrito abaixo.

## Checkout PagBank

Os botões de compra permitem escolher Pix ou cartão antes de criar um checkout hospedado em produção pela API oficial `POST https://api.pagseguro.com/checkouts`. Cada checkout aceita somente o método escolhido, e o servidor define o valor: mensal Pix R$ 22,90/cartão R$ 24,90; anual Pix R$ 169,90/cartão R$ 179,90. Configure `PAGBANK_TOKEN` somente no ambiente seguro do servidor e `NEXT_PUBLIC_SITE_URL` com a origem HTTPS pública. O fluxo PagBank não requer banco de dados: a referência contém somente o plano, método e um identificador aleatório; o navegador conserva temporariamente o identificador do checkout em `sessionStorage`, e a página `/obrigado` consulta o pedido diretamente na API do PagBank.

Cada checkout registra `https://SEU-DOMINIO/api/webhooks/pagbank` nos campos de notificação de checkout e pagamento da API. O webhook confere `x-authenticity-token` com o cálculo SHA-256 oficial sobre o token e o corpo bruto recebido e valida o pedido consultando a API autenticada do PagBank. O retorno para `/obrigado` não é tratado como confirmação de pagamento. Sem persistência externa, o webhook não mantém histórico nem deduplica eventos de forma durável; como somente valida e consulta o estado atual no PagBank, reenvios são processados sem efeitos colaterais. A idempotência durável da criação do checkout também não pode ser garantida sem armazenamento.

`DATABASE_URL` continua no projeto exclusivamente para a integração legada do Asaas, cujo webhook mantém eventos idempotentes no PostgreSQL. Ela não é necessária para criar ou consultar pagamentos PagBank.
