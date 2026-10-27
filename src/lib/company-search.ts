// Recherche d'entreprises (alternance) : constantes partagées serveur/client, sans dépendance serveur.

export type CompanyPriority = "faible" | "moyenne" | "haute";
export type CompanyKind = "offre" | "spontanee";
export type CompanyType = "son" | "lumiere" | "video";

export type CompanyMatch = {
  id: number; name: string; city: string; department: string; sector: string; address: string; types: string;
  salary: string; sources: string; perks: string; contactTitle: string; contactName: string; phone: string; email: string;
};

export const TYPE_LABEL: Record<CompanyType, string> = { son: "Son", lumiere: "Lumière", video: "Vidéo" };
export const TYPE_ORDER: CompanyType[] = ["son", "lumiere", "video"];

export const PRIORITY_LABEL: Record<CompanyPriority, string> = { faible: "Faible", moyenne: "Moyenne", haute: "Haute" };
export const KIND_LABEL: Record<CompanyKind, string> = { offre: "Offre", spontanee: "Spontanée" };

/** Nom + ville normalisés (minuscules, sans accents, espaces compressés) pour repérer la même entreprise entre deux imports différents. */
export function companyKey(name: string, city: string) {
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
  return `${norm(name)}|${norm(city)}`;
}

/** "Son, Lumière, Vidéo" (ordre libre, variantes d'accents) → "son,lumiere,video" (ordre fixe, sous-ensemble présent). */
export function parseTypes(raw: string): string {
  const norm = raw.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const found = TYPE_ORDER.filter((t) => norm.includes(t));
  return found.join(",");
}

/** Statuts du tableur d'origine (parfois en majuscules, variantes) → la clé d'un des statuts par défaut (voir
 * db/seed.ts), ou null si rien ne correspond. Si ce statut a été supprimé en admin, la ligne retombe sur « aucun ». */
export function parseStatus(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (s.includes("refuse") && s.includes("entretien")) return "refuse_apres_entretien";
  if (s.includes("refus")) return "refuser";
  if (s.includes("annul")) return "annuler";
  if (s.includes("entretien")) return "entretien_prevu";
  if (s.includes("relance")) return "relance";
  if (s.includes("rappel")) return "rappeler";
  if (s.includes("cv")) return "cv_envoye";
  if (s.includes("en cours")) return "en_cours";
  if (s.includes("valid")) return "valider";
  if (s.includes("contacter")) return "a_contacter";
  return null;
}

export function parsePriority(raw: string): CompanyPriority | null {
  const s = raw.trim().toLowerCase();
  if (s.startsWith("faible")) return "faible";
  if (s.startsWith("moyen")) return "moyenne";
  if (s.startsWith("haute") || s.startsWith("haut")) return "haute";
  return null;
}

export function parseKind(raw: string): CompanyKind | null {
  const s = raw.trim().toLowerCase();
  if (s.startsWith("offre")) return "offre";
  if (s.startsWith("spontan")) return "spontanee";
  return null;
}

/** "17/03/2026" → "2026-03-17" ; null si le texte n'est pas une date (le tableur d'origine contient parfois "Mail", "Tel"…). */
export function parseFrDate(raw: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw.trim());
  if (!m) return null;
  const [, d, mo, y] = m;
  const day = Number(d), month = Number(mo);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  return `${y}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

export function parseDelay(raw: string): number | null {
  const n = Number(raw.trim());
  return Number.isFinite(n) && n > 0 && n < 10000 ? Math.round(n) : null;
}

/** Parseur CSV minimal mais correct : virgules et retours à la ligne entre guillemets, guillemets doublés échappés. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c === "\r") { /* ignoré */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}
