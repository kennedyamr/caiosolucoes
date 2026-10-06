export class AsaasConfigurationError extends Error {}

export function getAsaasApiKey() {
  const apiKey = process.env.ASAAS_API_KEY?.trim();
  if (!apiKey) {
    throw new AsaasConfigurationError(
      "Configure ASAAS_API_KEY no ambiente seguro do servidor."
    );
  }

  return apiKey;
}

export function getAsaasApiBaseUrl() {
  const configuredUrl =
    process.env.ASAAS_API_URL?.trim() || "https://api.asaas.com/v3";
  let apiUrl: URL;

  try {
    apiUrl = new URL(configuredUrl);
  } catch {
    throw new AsaasConfigurationError(
      "ASAAS_API_URL deve ser a URL base HTTPS da API do Asaas."
    );
  }

  if (
    apiUrl.protocol !== "https:" ||
    !["api.asaas.com", "api-sandbox.asaas.com"].includes(apiUrl.hostname) ||
    !["", "/v3", "/v3/"].includes(apiUrl.pathname) ||
    apiUrl.search ||
    apiUrl.hash ||
    apiUrl.username ||
    apiUrl.password
  ) {
    throw new AsaasConfigurationError(
      "ASAAS_API_URL deve usar api.asaas.com ou api-sandbox.asaas.com em HTTPS."
    );
  }

  return `${apiUrl.origin}/v3`;
}

export function asaasApiUrl(resource: string) {
  return `${getAsaasApiBaseUrl()}/${resource.replace(/^\/+/, "")}`;
}
