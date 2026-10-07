const infinitePayCheckoutHostnames = new Set([
  "checkout.infinitepay.io",
  "checkout.infinitepay.com.br",
]);

export function parseInfinitePayCheckoutUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username !== "" ||
      url.password !== "" ||
      url.port !== "" ||
      !infinitePayCheckoutHostnames.has(url.hostname)
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}
