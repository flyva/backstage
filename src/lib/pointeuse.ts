// Pointeuse : résolution du statut d'une journée et agrégats (semaine / mois / année). Partagé serveur / client.
import type { WorkKind } from "@/db/schema";
import { addDays, isDay, monthGrid } from "@/lib/alternance";

/** Journée « standard » fixe (école, congé, maladie) : 7 h effectives, indépendamment du réglage personnel de la personne. */
export const STANDARD_DAY_MINUTES = 7 * 60;
/** Pause fixe des jours école (1 h le midi). Congé et maladie n'ont pas de pause (pas de journée réelle à couper). */
export const SCHOOL_PAUSE_MINUTES = 60;

export type TimeEntry = { id: number; startMinutes: number; endMinutes: number; pauseMinutes: number; comment: string | null };
export type DaySource = "entries" | "ecole" | "conge" | "maladie" | "non_travaille" | "futur";
export type DaySummary = {
  day: string;
  source: DaySource;
  grossMinutes: number; // fin - début, sommé sur les lignes (= effectif + pause)
  pauseMinutes: number;
  effectiveMinutes: number; // temps de travail net
  overtimeMinutes: number; // au-delà de la durée standard de la personne (0 si jour non travaillé)
  entries: TimeEntry[];
};
export type Totals = { grossMinutes: number; pauseMinutes: number; effectiveMinutes: number; overtimeMinutes: number; days: number };

const ZERO: Totals = { grossMinutes: 0, pauseMinutes: 0, effectiveMinutes: 0, overtimeMinutes: 0, days: 0 };

/** Jours dont le statut est fixé par le planning d'alternance (ou un arrêt), prioritaires sur les lignes saisies. */
export const FIXED_KINDS: WorkKind[] = ["ecole", "conge", "maladie"];

/** Résout le statut d'une journée : école/congé/maladie priment (7 h fixes), sinon la somme des lignes saisies, sinon « non travaillé ». */
export function daySummary(day: string, today: string, kind: WorkKind | undefined, entries: TimeEntry[], standardWorkMinutes: number): DaySummary {
  if (day > today) return { day, source: "futur", grossMinutes: 0, pauseMinutes: 0, effectiveMinutes: 0, overtimeMinutes: 0, entries: [] };
  if (kind === "ecole") {
    return { day, source: "ecole", grossMinutes: STANDARD_DAY_MINUTES + SCHOOL_PAUSE_MINUTES, pauseMinutes: SCHOOL_PAUSE_MINUTES, effectiveMinutes: STANDARD_DAY_MINUTES, overtimeMinutes: 0, entries: [] };
  }
  if (kind === "conge" || kind === "maladie") {
    return { day, source: kind, grossMinutes: STANDARD_DAY_MINUTES, pauseMinutes: 0, effectiveMinutes: STANDARD_DAY_MINUTES, overtimeMinutes: 0, entries: [] };
  }
  if (entries.length === 0) return { day, source: "non_travaille", grossMinutes: 0, pauseMinutes: 0, effectiveMinutes: 0, overtimeMinutes: 0, entries: [] };
  const grossMinutes = entries.reduce((s, e) => s + Math.max(0, e.endMinutes - e.startMinutes), 0);
  const pauseMinutes = entries.reduce((s, e) => s + e.pauseMinutes, 0);
  const effectiveMinutes = Math.max(0, grossMinutes - pauseMinutes);
  return { day, source: "entries", grossMinutes, pauseMinutes, effectiveMinutes, overtimeMinutes: Math.max(0, effectiveMinutes - standardWorkMinutes), entries };
}

export function sumDays(list: DaySummary[]): Totals {
  return list.reduce(
    (t, d) => ({
      grossMinutes: t.grossMinutes + d.grossMinutes,
      pauseMinutes: t.pauseMinutes + d.pauseMinutes,
      effectiveMinutes: t.effectiveMinutes + d.effectiveMinutes,
      overtimeMinutes: t.overtimeMinutes + d.overtimeMinutes,
      days: t.days + (d.source === "non_travaille" || d.source === "futur" ? 0 : 1),
    }),
    ZERO,
  );
}

/** Jours d'un mois en semaines complètes (lundi-dimanche), comme le planning — typiquement 4 à 6 semaines selon le mois. */
export function monthWeeks(month: string): string[][] {
  const grid = monthGrid(month).map((d) => d.day);
  const weeks: string[][] = [];
  for (let i = 0; i < grid.length; i += 7) weeks.push(grid.slice(i, i + 7));
  return weeks;
}

/** Jours d'une période en semaines complètes (lundi-dimanche) contenant chaque borne. */
export function rangeWeeks(from: string, to: string): string[][] {
  const weekday = (d: string) => (new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7;
  const start = addDays(from, -weekday(from));
  const end = addDays(to, 6 - weekday(to));
  const weeks: string[][] = [];
  for (let d = start; d <= end; d = addDays(d, 7)) weeks.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
  return weeks;
}

export const isYear = (v: unknown): v is string => typeof v === "string" && /^\d{4}$/.test(v) && Number(v) >= 2000 && Number(v) <= 2100;
export const monthsOfYear = (year: string) => Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);

export const SOURCE_LABEL: Record<DaySource, string> = {
  entries: "Pointé", ecole: "École", conge: "Congé", maladie: "Maladie", non_travaille: "Non travaillé", futur: "—",
};
export const SOURCE_CLASS: Record<DaySource, string> = {
  entries: "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200",
  ecole: "bg-blue-500/20 text-blue-800 dark:text-blue-200",
  conge: "bg-amber-500/20 text-amber-800 dark:text-amber-200",
  maladie: "bg-rose-500/20 text-rose-800 dark:text-rose-200",
  non_travaille: "bg-zinc-500/10 text-muted",
  futur: "opacity-40",
};

export { isDay };
