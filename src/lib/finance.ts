// Comptabilité du BDE : mêmes libellés, mêmes postes et mêmes agrégats que l'outil « Finances » d'Oasis.
// Partagé serveur / client (pas de dépendance serveur).
import type { FinanceCategory, FinanceDirection } from "@/db/schema";

export const DIRECTION_LABEL: Record<FinanceDirection, string> = {
  income: "Recette",
  expense: "Dépense",
};

/** Postes analytiques (communs recette/dépense, filtrés à l'affichage) — repris d'Oasis. */
export const CATEGORY_LABEL: Record<FinanceCategory, string> = {
  cotisations: "Cotisations / adhésions",
  subventions: "Subventions",
  dons: "Dons & mécénat",
  evenements: "Événements",
  ventes: "Ventes & boutique",
  prestations: "Prestations",
  fonctionnement: "Frais de fonctionnement",
  deplacements: "Déplacements",
  materiel: "Matériel & équipement",
  communication: "Communication",
  banque: "Frais bancaires",
  autre: "Autre",
};

export const fmtEuros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export type FinanceEntryLike = { direction: FinanceDirection; category: FinanceCategory; amountCents: number; occurredOn: string };

export type CategoryRow = { key: FinanceCategory; label: string; incomeCents: number; expenseCents: number };
export type MonthRow = { incomeCents: number; expenseCents: number }; // index 0 = janvier … 11 = décembre

export type FinanceSummary = {
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  count: number;
  byCategory: CategoryRow[];
  byMonth: MonthRow[];
  subventionsCents: number;
};

/** Même calcul que FinanceStats::summarize() côté Oasis : totaux, ventilation par poste (triée par montant) et par mois. */
export function summarizeFinance(entries: FinanceEntryLike[]): FinanceSummary {
  let incomeCents = 0;
  let expenseCents = 0;
  const byCategory = new Map<FinanceCategory, CategoryRow>();
  const byMonth: MonthRow[] = Array.from({ length: 12 }, () => ({ incomeCents: 0, expenseCents: 0 }));

  for (const e of entries) {
    const row = byCategory.get(e.category) ?? { key: e.category, label: CATEGORY_LABEL[e.category], incomeCents: 0, expenseCents: 0 };
    const month = Number(e.occurredOn.slice(5, 7)) - 1;
    if (e.direction === "income") {
      incomeCents += e.amountCents;
      row.incomeCents += e.amountCents;
      if (byMonth[month]) byMonth[month].incomeCents += e.amountCents;
    } else {
      expenseCents += e.amountCents;
      row.expenseCents += e.amountCents;
      if (byMonth[month]) byMonth[month].expenseCents += e.amountCents;
    }
    byCategory.set(e.category, row);
  }

  const sortedCategories = [...byCategory.values()].sort((a, b) => (b.incomeCents + b.expenseCents) - (a.incomeCents + a.expenseCents));

  return {
    incomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents,
    count: entries.length,
    byCategory: sortedCategories,
    byMonth,
    subventionsCents: byCategory.get("subventions")?.incomeCents ?? 0,
  };
}

export type AccountingAccountLike = { id: number; number: string; nameNormal: string; nameArranged: string };
export type AccountRow = { id: number | null; number: string; name: string; incomeCents: number; expenseCents: number };

/**
 * Regroupe les écritures par compte comptable (plan comptable), au lieu du poste analytique.
 * `arranged` choisit le nom affiché : le nom "arrangé" (pour tout le monde) ou le nom normal (pour le DAF/les impôts).
 */
export function summarizeByAccount(
  entries: (FinanceEntryLike & { accountingAccountId: number | null })[],
  accounts: AccountingAccountLike[],
  arranged: boolean,
): AccountRow[] {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const rows = new Map<number | null, AccountRow>();
  for (const e of entries) {
    const acc = e.accountingAccountId != null ? byId.get(e.accountingAccountId) : undefined;
    const key = acc?.id ?? null;
    const row = rows.get(key) ?? { id: key, number: acc?.number ?? "—", name: acc ? (arranged ? acc.nameArranged : acc.nameNormal) : "Non classé", incomeCents: 0, expenseCents: 0 };
    if (e.direction === "income") row.incomeCents += e.amountCents; else row.expenseCents += e.amountCents;
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => (b.incomeCents + b.expenseCents) - (a.incomeCents + a.expenseCents));
}

/** Solde cumulé mois par mois sur l'exercice, à partir d'un solde d'ouverture (pour l'espace « courbe »). */
export function cumulativeBalance(byMonth: MonthRow[], openingCents: number): number[] {
  let running = openingCents;
  return byMonth.map((m) => (running += m.incomeCents - m.expenseCents));
}
