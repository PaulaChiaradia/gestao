export const CHANNELS = [
  { value: "instagram-bio", label: "Instagram — link da bio / Linktree" },
  { value: "instagram-stories", label: "Instagram — Stories" },
  { value: "instagram-feed", label: "Instagram — post ou Reels" },
  { value: "instagram-direct", label: "Instagram — Direct" },
  { value: "whatsapp", label: "WhatsApp — conversa" },
  { value: "whatsapp-grupo", label: "WhatsApp — grupo de lojistas" },
  { value: "meta-ads", label: "Anúncios Meta" },
  { value: "youtube", label: "YouTube" },
  { value: "email", label: "E-mail" },
  { value: "palestra", label: "Palestra / evento (QR code)" },
] as const;

export const channelLabel = (value: string) => CHANNELS.find((c) => c.value === value)?.label ?? value;

/** "Desafio Verão 2026" → "desafio-verao-2026" (a Hotmart só aceita caracteres simples em src/sck). */
export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export type LinkProduct = {
  id: string;
  name: string;
  checkout_code: string | null;
  default_offer_code: string | null;
  sales_page_url: string | null;
};

export function buildTrackedUrl(
  product: LinkProduct,
  target: "pagina" | "checkout",
  channel: string,
  campaign: string,
): string | null {
  const base =
    target === "pagina"
      ? product.sales_page_url
      : product.checkout_code
        ? `https://pay.hotmart.com/${product.checkout_code}`
        : null;
  if (!base) return null;

  const url = new URL(base);
  if (target === "checkout" && product.default_offer_code) url.searchParams.set("off", product.default_offer_code);
  url.searchParams.set("src", channel);
  const sck = slugify(campaign);
  if (sck) url.searchParams.set("sck", sck);
  return url.toString();
}
