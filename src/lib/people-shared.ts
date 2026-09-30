import type { LinkKind } from "@/db/schema";

// Libellés des types de liens (réseaux sociaux, portfolio) : partagés entre serveur et client.
export const LINK_LABEL: Record<LinkKind, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  youtube: "YouTube",
  vimeo: "Vimeo",
  behance: "Behance",
  github: "GitHub",
  tiktok: "TikTok",
  x: "X",
  facebook: "Facebook",
  portfolio: "Portfolio",
  site: "Site web",
  autre: "Autre lien",
};

/** Adresse https valide (le schéma est ajouté si besoin), ou null. */
export function normalizeUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t || t.length > 300) return null;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!u.hostname.includes(".") || /\s/.test(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** 3IS : l'adresse du compte compte comme adresse 3IS si elle est en @3is.fr. */
export const school3isEmail = (email: string) => (/@3is\.fr$/i.test(email) ? email.toLowerCase() : null);

export const PHONE_RE = /^[+0-9][0-9 .()-]{5,24}$/;
export const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
