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

## Checkout e webhooks do Asaas

Configure as variáveis do arquivo `.env.example` no ambiente do servidor. `ASAAS_API_KEY` é usada somente pela API server-side; não a renomeie para `NEXT_PUBLIC_*`. `NEXT_PUBLIC_SITE_URL` deve ser a origem pública do site, sem caminho adicional. `ASAAS_API_URL` é opcional e aceita a API de produção ou Sandbox do Asaas; se omitida, usa produção.

O pagamento via Pix coleta nome, e-mail e CPF, cria o pagador e a cobrança no Asaas, e acompanha a confirmação por API e webhook. O QR Code e o código copia e cola são retornados ao cliente; os dados pessoais do pagador são enviados ao Asaas e não ficam armazenados no banco da loja. Para pagamento com cartão, a API cria um Checkout Asaas avulso e redireciona o cliente para a página hospedada pelo Asaas.

Para receber eventos, configure no Asaas o webhook `https://SEU-DOMINIO/api/webhooks/asaas`, usando o valor de `ASAAS_WEBHOOK_TOKEN` como token de autenticação e habilitando `CHECKOUT_CREATED`, `CHECKOUT_PAID`, `CHECKOUT_CANCELED`, `CHECKOUT_EXPIRED`, `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`, `PAYMENT_REFUNDED`, `PAYMENT_PARTIALLY_REFUNDED` e `PAYMENT_RECEIVED_IN_CASH_UNDONE`. A persistência idempotente exige PostgreSQL configurado em `DATABASE_URL`; as tabelas de eventos e status são criadas automaticamente. Os eventos de pagamento e a consulta autenticada à API, não uma URL de retorno, confirmam o Pix.
