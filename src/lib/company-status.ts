// Statuts d'entreprise (recherche d'alternance) : constantes partagées serveur/client, sans dépendance serveur.
import type { STATUS_COLORS } from "@/db/schema";

export type StatusColor = (typeof STATUS_COLORS)[number];
export type CompanyStatusDef = { key: string; label: string; color: StatusColor };

export const STATUS_COLOR_LABEL: Record<StatusColor, string> = {
  zinc: "Gris", slate: "Ardoise", red: "Rouge", rose: "Rose", orange: "Orange", amber: "Ambre",
  emerald: "Émeraude", teal: "Sarcelle", sky: "Ciel", blue: "Bleu", indigo: "Indigo", violet: "Violet", pink: "Fuchsia",
};
export const STATUS_COLOR_ORDER: StatusColor[] = ["zinc", "slate", "red", "rose", "orange", "amber", "emerald", "teal", "sky", "blue", "indigo", "violet", "pink"];

// Classes Tailwind écrites en toutes lettres (le compilateur JIT ne génère que les classes qu'il voit littéralement
// dans le code source : impossible de construire `bg-${color}-500` dynamiquement).
export const STATUS_DOT_CLASS: Record<StatusColor, string> = {
  zinc: "bg-zinc-500", slate: "bg-slate-500", red: "bg-red-500", rose: "bg-rose-500", orange: "bg-orange-500",
  amber: "bg-amber-500", emerald: "bg-emerald-500", teal: "bg-teal-500", sky: "bg-sky-500", blue: "bg-blue-500",
  indigo: "bg-indigo-500", violet: "bg-violet-500", pink: "bg-pink-500",
};
export const STATUS_BADGE_CLASS: Record<StatusColor, string> = {
  zinc: "bg-zinc-500/20 text-zinc-700 dark:text-zinc-300",
  slate: "bg-slate-500/20 text-slate-700 dark:text-slate-300",
  red: "bg-red-500/20 text-red-800 dark:text-red-200",
  rose: "bg-rose-500/20 text-rose-800 dark:text-rose-200",
  orange: "bg-orange-500/20 text-orange-800 dark:text-orange-200",
  amber: "bg-amber-500/20 text-amber-800 dark:text-amber-200",
  emerald: "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200",
  teal: "bg-teal-500/20 text-teal-800 dark:text-teal-200",
  sky: "bg-sky-500/20 text-sky-800 dark:text-sky-200",
  blue: "bg-blue-500/20 text-blue-800 dark:text-blue-200",
  indigo: "bg-indigo-500/20 text-indigo-800 dark:text-indigo-200",
  violet: "bg-violet-500/20 text-violet-800 dark:text-violet-200",
  pink: "bg-pink-500/20 text-pink-800 dark:text-pink-200",
};
export const STATUS_ROW_CLASS: Record<StatusColor, string> = {
  zinc: "border-l-4 border-zinc-500 bg-zinc-500/5",
  slate: "border-l-4 border-slate-500 bg-slate-500/5",
  red: "border-l-4 border-red-500 bg-red-500/5",
  rose: "border-l-4 border-rose-500 bg-rose-500/5",
  orange: "border-l-4 border-orange-500 bg-orange-500/5",
  amber: "border-l-4 border-amber-500 bg-amber-500/5",
  emerald: "border-l-4 border-emerald-500 bg-emerald-500/5",
  teal: "border-l-4 border-teal-500 bg-teal-500/5",
  sky: "border-l-4 border-sky-500 bg-sky-500/5",
  blue: "border-l-4 border-blue-500 bg-blue-500/5",
  indigo: "border-l-4 border-indigo-500 bg-indigo-500/5",
  violet: "border-l-4 border-violet-500 bg-violet-500/5",
  pink: "border-l-4 border-pink-500 bg-pink-500/5",
};

/** Normalise un libellé en clé stable (ex. "À contacter" → "a_contacter"). */
export function slugifyStatusKey(label: string): string {
  return label.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "statut";
}
