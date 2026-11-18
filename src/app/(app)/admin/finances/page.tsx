import Link from "next/link";
import { desc, max, min, sql } from "drizzle-orm";
import { ArrowDownCircle, ArrowUpCircle, Pencil, Plus, Printer, Scale, Trash2 } from "lucide-react";
import { db } from "@/db";
import { bdeFinancialEntries, FINANCE_CATEGORIES, FINANCE_DIRECTIONS, type FinanceCategory, type FinanceDirection } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { todayParis } from "@/lib/equipment";
import { CATEGORY_LABEL, fmtEuros, summarizeFinance } from "@/lib/finance";
import { deleteFinancialEntry } from "@/lib/finance-actions";
import { FinanceChart } from "@/components/FinanceChart";
import { FinanceFilterForm } from "@/components/finance-forms";
import { ConfirmButton } from "@/components/ConfirmButton";

export const metadata = { title: "Comptabilité BDE" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" });

export default async function FinancesPage({ searchParams }: PageProps<"/admin/finances">) {
  await requireAdmin();
  const sp = await searchParams;
  const currentYear = Number(todayParis().slice(0, 4));

  const [{ mn, mx }] = await db.select({ mn: min(sql<string>`year(${bdeFinancialEntries.occurredOn})`), mx: max(sql<string>`year(${bdeFinancialEntries.occurredOn})`) }).from(bdeFinancialEntries);
  const minYear = mn ? Number(mn) : currentYear;
  const maxYear = Math.max(mx ? Number(mx) : currentYear, currentYear);
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);

  const yParam = Number(sp.year);
  const year = years.includes(yParam) ? yParam : currentYear;
  const direction = (FINANCE_DIRECTIONS as readonly string[]).includes(String(sp.direction)) ? (sp.direction as FinanceDirection) : undefined;
  const category = (FINANCE_CATEGORIES as readonly string[]).includes(String(sp.category)) ? (sp.category as FinanceCategory) : undefined;

  const all = await db.select().from(bdeFinancialEntries).orderBy(desc(bdeFinancialEntries.occurredOn), desc(bdeFinancialEntries.id));
  const entries = all.filter((e) => e.occurredOn.startsWith(String(year)) && (!direction || e.direction === direction) && (!category || e.category === category));
  const summary = summarizeFinance(entries);

  const qs = (params: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) u.set(k, v);
    const s = u.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/finances/nouvelle" className="btn"><Plus size={16} /> Nouvelle écriture</Link>
        <Link href={`/admin/finances/imprimer${qs({ year: String(year) })}`} target="_blank" className="btn-ghost"><Printer size={16} /> Rapport {year} (PDF)</Link>
      </div>

      <FinanceFilterForm years={years} year={year} direction={direction} category={category} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"><ArrowDownCircle size={20} /></span><div><div className="text-xs text-muted">Recettes {year}</div><div className="text-xl font-bold tabular-nums">{fmtEuros(summary.incomeCents)}</div></div></div>
        <div className="card flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-500/15 text-red-600 dark:text-red-400"><ArrowUpCircle size={20} /></span><div><div className="text-xs text-muted">Dépenses {year}</div><div className="text-xl font-bold tabular-nums">{fmtEuros(summary.expenseCents)}</div></div></div>
        <div className="card flex items-center gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${summary.balanceCents >= 0 ? "bg-accent/15 text-accent" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"}`}><Scale size={20} /></span><div><div className="text-xs text-muted">Solde</div><div className="text-xl font-bold tabular-nums">{fmtEuros(summary.balanceCents)}</div></div></div>
        <div className="card flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400"><ArrowDownCircle size={20} /></span><div><div className="text-xs text-muted">Subventions</div><div className="text-xl font-bold tabular-nums">{fmtEuros(summary.subventionsCents)}</div></div></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <FinanceChart byMonth={summary.byMonth} />
        <div className="card p-0">
          <h2 className="border-b border-line px-4 py-3 font-semibold">Par poste</h2>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="px-4 py-1.5 font-medium">Poste</th><th className="px-2 py-1.5 text-right font-medium text-emerald-600 dark:text-emerald-400">Recettes</th><th className="px-4 py-1.5 text-right font-medium text-red-600 dark:text-red-400">Dépenses</th></tr></thead>
            <tbody className="divide-y divide-line">
              {summary.byCategory.length === 0 && <tr><td colSpan={3} className="px-4 py-4 text-center text-muted">Aucune donnée.</td></tr>}
              {summary.byCategory.map((row) => (
                <tr key={row.key}><td className="px-4 py-1.5">{row.label}</td><td className="px-2 py-1.5 text-right tabular-nums">{fmtEuros(row.incomeCents)}</td><td className="px-4 py-1.5 text-right tabular-nums">{fmtEuros(row.expenseCents)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <section className="card p-0">
        <h2 className="border-b border-line px-4 py-3 font-semibold">Écritures ({summary.count})</h2>
        {entries.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">Aucune écriture pour ces filtres.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-line bg-bg text-left text-xs text-muted"><th className="px-4 py-1.5 font-medium">Date</th><th className="py-1.5 pr-3 font-medium">Libellé</th><th className="py-1.5 pr-3 font-medium">Poste</th><th className="py-1.5 pr-3 text-right font-medium">Montant</th><th className="py-1.5 pr-4 font-medium" /></tr></thead>
              <tbody className="divide-y divide-line">
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap px-4 py-1.5">{dateFmt.format(new Date(`${e.occurredOn}T12:00:00`))}</td>
                    <td className="py-1.5 pr-3">{e.label}{e.reference && <span className="block text-xs text-muted">Réf. {e.reference}</span>}</td>
                    <td className="py-1.5 pr-3 text-muted">{CATEGORY_LABEL[e.category]}</td>
                    <td className={`py-1.5 pr-3 text-right font-medium tabular-nums ${e.direction === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{e.direction === "income" ? "+ " : "− "}{fmtEuros(e.amountCents)}</td>
                    <td className="py-1.5 pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/finances/${e.id}/modifier`} className="text-muted hover:text-fg" aria-label="Modifier"><Pencil size={14} /></Link>
                        <form action={deleteFinancialEntry}>
                          <input type="hidden" name="id" value={e.id} />
                          <ConfirmButton message={`Supprimer l'écriture « ${e.label} » ?`} className="text-muted hover:text-danger">
                            <Trash2 size={14} />
                          </ConfirmButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
