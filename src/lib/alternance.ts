// Planning d'alternance : constantes et calendrier (partagé serveur / client, sans dépendance serveur).
import type { WorkKind } from "@/db/schema";

export const KIND_LABEL: Record<WorkKind, string> = { ecole: "École", entreprise: "Entreprise", conge: "Congé", ferie: "Férié" };
export const KIND_CLASS: Record<WorkKind, string> = {
  ecole: "bg-blue-500/20 text-blue-800 dark:text-blue-200",
  entreprise: "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200",
  conge: "bg-amber-500/20 text-amber-800 dark:text-amber-200",
  ferie: "bg-zinc-500/20 text-zinc-700 dark:text-zinc-300",
};
/** Ordre du clic sur un jour : vide → école → entreprise → congé → férié → vide. */
export const KIND_CYCLE: (WorkKind | null)[] = [null, "ecole", "entreprise", "conge", "ferie"];

export const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T12:00:00Z`));
export const isMonth = (v: unknown): v is string => typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

const at = (day: string) => new Date(`${day}T12:00:00Z`);
export const addDays = (day: string, n: number) => {
  const d = at(day);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const addMonths = (month: string, n: number) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1, 12));
  return d.toISOString().slice(0, 7);
};
/** 0 = lundi … 6 = dimanche. */
export const weekday = (day: string) => (at(day).getUTCDay() + 6) % 7;
export const isWeekend = (day: string) => weekday(day) >= 5;

/** Jours affichés pour un mois : des semaines entières, du lundi au dimanche. */
export function monthGrid(month: string): { day: string; inMonth: boolean }[] {
  const first = `${month}-01`;
  const start = addDays(first, -weekday(first));
  const last = addDays(addMonths(month, 1) + "-01", -1);
  const end = addDays(last, 6 - weekday(last));
  const out: { day: string; inMonth: boolean }[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push({ day: d, inMonth: d.startsWith(month) });
  return out;
}

export const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", month: "long", year: "numeric" }).format(at(`${month}-01`));
export const dayLabel = (day: string) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(at(day));

export const fmtHours = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
};

/** « 7:30 », « 7h30 », « 7,5 » ou « 7.5 » → minutes ; null si invalide. */
export function parseHours(input: string): number | null {
  const v = input.trim().toLowerCase().replace(",", ".");
  let m = /^(\d{1,2})\s*[h:]\s*(\d{1,2})?$/.exec(v);
  if (m) {
    const min = m[2] ? Number(m[2]) : 0;
    return min < 60 ? Number(m[1]) * 60 + min : null;
  }
  m = /^(\d{1,2})(?:\.(\d{1,2}))?$/.exec(v);
  if (m) return Math.round(Number(`${m[1]}.${m[2] ?? 0}`) * 60);
  return null;
}
