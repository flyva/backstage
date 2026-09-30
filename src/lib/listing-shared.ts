import type { ListingCategory } from "@/db/schema";

// Partagé entre serveur et client.
export const LISTING_LABEL: Record<ListingCategory, string> = {
  vente: "À vendre",
  logement: "Logement et colocation",
  mission: "Missions et extras",
  recherche: "Je recherche",
  don: "Don",
  autre: "Autre",
};

export const LISTING_TTL_DAYS = 60;
export const MAX_LISTING_PHOTO_BYTES = 400 * 1024;
export const LISTING_PHOTO_PREFIX = "/api/listing-photo/";
export const LISTING_PHOTO_NAME = /^[a-f0-9]{24}\.(jpg|png|webp)$/;

/**
 * Affichage d'un prix saisi librement : « 50 », « 50eur », « 1200,5 » → « 50 € », « 1 200,5 € ». Une mention après le montant est conservée
 * (« 400/mois » → « 400 €/mois »). Un texte libre (« Gratuit », « À débattre ») reste tel quel.
 */
export function formatPrice(raw: string | null | undefined): string | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  // Montant : « 1 200 », « 1.200 » (milliers) ou « 50 », puis des centimes facultatifs (« ,5 », « .50 »).
  const m = /^(\d{1,3}(?:[\s.]\d{3})+|\d+)(?:[.,](\d{1,2})(?!\d))?/.exec(t);
  if (!m) return t; // texte libre : « Gratuit », « À débattre »…
  const amount = Number(m[1].replace(/[\s.]/g, "")) + (m[2] ? Number("0." + m[2]) : 0);
  // Ce qui suit le montant : un symbole « € » / « eur » collé est absorbé ; le reste (« /mois », « à débattre ») est conservé.
  let rest = t.slice(m[0].length).replace(/^\s*(€|eur(?:os?)?\b)/i, "").trim();
  if (/€|\beur/i.test(rest)) return t; // un autre symbole plus loin : on n'y touche pas
  const num = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: amount % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(amount).replace(/\u202f|\u00a0/g, " ");
  rest = rest ? (rest.startsWith("/") ? rest : ` ${rest}`) : "";
  return `${num} €${rest}`;
}

/** Une photo principale + des photos secondaires : 6 au total. */
export const MAX_LISTING_PHOTOS = 6;
