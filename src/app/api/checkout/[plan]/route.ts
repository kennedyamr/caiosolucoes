import { isPlanSlug, plans } from "@/lib/plans";
import {
  AsaasConfigurationError,
  asaasApiUrl,
  getAsaasApiKey,
} from "@/lib/asaas-api";

export const runtime = "nodejs";

function getPublicSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configuredUrl) {
    return {
      error:
        "Checkout indisponível: configure NEXT_PUBLIC_SITE_URL com a URL pública do site.",
    };
  }

  let siteUrl: URL;
  try {
    siteUrl = new URL(configuredUrl);
  } catch {
    return {
      error:
        "Configuração inválida: NEXT_PUBLIC_SITE_URL precisa ser uma URL pública válida.",
    };
  }

  if (
    !["http:", "https:"].includes(siteUrl.protocol) ||
    siteUrl.pathname !== "/" ||
    siteUrl.search ||
    siteUrl.hash ||
    siteUrl.username ||
    siteUrl.password
  ) {
    return {
      error:
        "Configuração inválida: NEXT_PUBLIC_SITE_URL deve conter apenas a origem pública do site.",
    };
  }

  return { siteUrl: siteUrl.origin };
}

async function getPlanImageBase64(
  siteOrigin: string,
  imageFile: string
): Promise<string> {
  const imageUrl = new URL(`/${imageFile}`, siteOrigin);
  const response = await fetch(imageUrl, {
    cache: "force-cache",
    signal: AbortSignal.timeout(10000),
  });

  if (
    !response.ok ||
    new URL(response.url).origin !== siteOrigin ||
    !response.headers.get("content-type")?.startsWith("image/")
  ) {
    throw new Error("The public plan image could not be loaded.");
  }

  const image = Buffer.from(await response.arrayBuffer());
  if (image.length === 0 || image.length > 3_000_000) {
    throw new Error("The public plan image has an invalid size.");
  }

  return image.toString("base64");
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/checkout/[plan]">
) {
  const { plan: slug } = await context.params;
  if (!isPlanSlug(slug)) {
    return Response.json({ error: "Plano não encontrado." }, { status: 404 });
  }

  let apiKey: string;
  let checkoutEndpoint: string;
  try {
    apiKey = getAsaasApiKey();
    checkoutEndpoint = asaasApiUrl("checkouts");
  } catch (error) {
    if (!(error instanceof AsaasConfigurationError)) throw error;
    return Response.json(
      {
        error: `Checkout com cartão indisponível: ${error.message}`,
      },
      { status: 503 }
    );
  }

  const siteConfiguration = getPublicSiteUrl();
  if ("error" in siteConfiguration) {
    return Response.json(
      { error: siteConfiguration.error },
      { status: 503 }
    );
  }

  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && requestOrigin !== siteConfiguration.siteUrl) {
    return Response.json(
      { error: "Origem não autorizada para iniciar o checkout." },
      { status: 403 }
    );
  }

  const plan = plans[slug];
  let imageBase64: string;
  try {
    imageBase64 = await getPlanImageBase64(
      siteConfiguration.siteUrl,
      plan.imageFile
    );
  } catch (error) {
    console.error("Unable to load the public image for the Asaas checkout.", error);
    return Response.json(
      {
        error:
          "Não foi possível carregar a imagem pública do plano. Verifique se os arquivos do plano estão publicados.",
      },
      { status: 502 }
    );
  }

  let asaasResponse: Response;
  try {
    asaasResponse = await fetch(checkoutEndpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        access_token: apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        billingTypes: ["CREDIT_CARD"],
        chargeTypes: ["DETACHED"],
        externalReference: `caio-solucoes:${slug}`,
        callback: {
          successUrl: `${siteConfiguration.siteUrl}/obrigado?plano=${slug}`,
          cancelUrl: `${siteConfiguration.siteUrl}/checkout/${slug}`,
          expiredUrl: `${siteConfiguration.siteUrl}/checkout/${slug}`,
        },
        items: [
          {
            name: plan.checkoutItemName,
            quantity: 1,
            value: plan.cardPriceInCents / 100,
            imageBase64,
          },
        ],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    console.error("Unable to reach the Asaas checkout API.", error);
    return Response.json(
      {
        error:
          "Não foi possível conectar ao Asaas para criar o checkout. Tente novamente.",
      },
      { status: 502 }
    );
  }

  if (!asaasResponse.ok) {
    console.error(
      "Asaas rejected checkout creation.",
      asaasResponse.status
    );
    return Response.json(
      {
        error:
          "O Asaas não conseguiu criar o checkout. Verifique a configuração da conta e tente novamente.",
      },
      { status: 502 }
    );
  }

  let checkout: unknown;
  try {
    checkout = await asaasResponse.json();
  } catch (error) {
    console.error("Asaas returned an invalid checkout response.", error);
    return Response.json(
      { error: "O Asaas retornou uma resposta inválida ao criar o checkout." },
      { status: 502 }
    );
  }

  if (
    typeof checkout !== "object" ||
    checkout === null ||
    !("id" in checkout) ||
    typeof checkout.id !== "string" ||
    !/^[a-zA-Z0-9-]{1,100}$/.test(checkout.id)
  ) {
    console.error("Asaas checkout response did not include a valid ID.");
    return Response.json(
      { error: "O Asaas não retornou um identificador de checkout válido." },
      { status: 502 }
    );
  }

  const checkoutUrl = new URL("https://asaas.com/checkoutSession/show");
  checkoutUrl.searchParams.set("id", checkout.id);

  return Response.json({ checkoutUrl: checkoutUrl.toString() });
}
