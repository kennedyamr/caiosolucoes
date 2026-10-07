import "server-only";

export const pagBankApiBaseUrl = "https://api.pagseguro.com";

export class PagBankConfigurationError extends Error {}

export function getPagBankToken() {
  const token = process.env.PAGBANK_TOKEN?.trim();
  if (!token) {
    throw new PagBankConfigurationError(
      "Configure PAGBANK_TOKEN no ambiente seguro do servidor."
    );
  }
  return token;
}

export function getPublicSiteOrigin() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configuredUrl) {
    throw new PagBankConfigurationError(
      "Configure NEXT_PUBLIC_SITE_URL com a origem pública do site."
    );
  }

  let siteUrl: URL;
  try {
    siteUrl = new URL(configuredUrl);
  } catch {
    throw new PagBankConfigurationError(
      "NEXT_PUBLIC_SITE_URL precisa ser uma URL pública válida."
    );
  }

  const isLocalDevelopment =
    process.env.NODE_ENV === "development" &&
    siteUrl.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(siteUrl.hostname);

  if (
    (!isLocalDevelopment && siteUrl.protocol !== "https:") ||
    siteUrl.pathname !== "/" ||
    siteUrl.search ||
    siteUrl.hash ||
    siteUrl.username ||
    siteUrl.password
  ) {
    throw new PagBankConfigurationError(
      "NEXT_PUBLIC_SITE_URL deve conter apenas a origem HTTPS pública do site."
    );
  }

  return siteUrl.origin;
}

export function pagBankApiUrl(path: string) {
  return new URL(path.replace(/^\/+/, ""), `${pagBankApiBaseUrl}/`).toString();
}

export function isPagBankPaymentUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      ["pagamento.pagbank.com.br", "checkout.pagbank.com.br"].includes(
        url.hostname
      )
    );
  } catch {
    return false;
  }
}
