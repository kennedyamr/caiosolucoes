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

Configure as variáveis do arquivo `.env.example` no ambiente do servidor. `ASAAS_API_KEY` é usada somente pela API server-side; não a renomeie para `NEXT_PUBLIC_*`. `NEXT_PUBLIC_SITE_URL` deve ser a origem pública do site, sem caminho adicional.

O pagamento por Pix é manual: a loja mostra a chave configurada no checkout e não confirma transferências automaticamente. Para pagamento com cartão, a API cria um Checkout Asaas avulso e redireciona o cliente para a página hospedada pelo Asaas.

Para receber eventos, configure no Asaas o webhook `https://SEU-DOMINIO/api/webhooks/asaas`, usando o valor de `ASAAS_WEBHOOK_TOKEN` como token de autenticação e habilitando `CHECKOUT_CREATED`, `CHECKOUT_PAID`, `CHECKOUT_CANCELED` e `CHECKOUT_EXPIRED`. A persistência idempotente exige PostgreSQL configurado em `DATABASE_URL`; as tabelas de eventos e status são criadas automaticamente. O evento `CHECKOUT_PAID`, não a URL de retorno, é o registro de confirmação do checkout.
