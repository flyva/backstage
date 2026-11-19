import Link from "next/link";
import { desc } from "drizzle-orm";
import {
  ArrowDownCircle, ArrowUpCircle, FileSpreadsheet, LineChart, Paperclip, Pencil, Plus, Printer, Scale, Settings2,
  TableProperties, Trash2, Upload,
} from "lucide-react";
import { db } from "@/db";
import { bdeFinancialEntries, FINANCE_CATEGORIES, FINANCE_DIRECTIONS, type FinanceCategory, type FinanceDirection } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { CATEGORY_LABEL, fmtEuros, summarizeByAccount, summarizeFinance } from "@/lib/finance";
import { getAccountingAccounts, getFiscalYears } from "@/lib/finance-data";
import { deleteFinancialEntry } from "@/lib/finance-actions";
import { FinanceChart } from "@/components/FinanceChart";
import { FinanceFilterForm } from "@/components/finance-forms";
import { ConfirmButton } from "@/components/ConfirmButton";

export const metadata = { title: "Comptabilité BDE" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" });

export default async function FinancesPage({ searchParams }: PageProps<"/admin/finances">) {
  await requireAdmin();
  const sp = await searchParams;

  const fiscalYears = await getFiscalYears();
  const current = fiscalYears.find((f) => f.isCurrent) ?? fiscalYears[0];
  const fyParam = Number(sp.fy);
  const fiscalYearId = fiscalYears.some((f) => f.id === fyParam) ? fyParam : current?.id;

  const direction = (FINANCE_DIRECTIONS as readonly string[]).includes(String(sp.direction)) ? (sp.direction as FinanceDirection) : undefined;
  const category = (FINANCE_CATEGORIES as readonly string[]).includes(String(sp.category)) ? (sp.category as FinanceCategory) : undefined;

  const accounts = await getAccountingAccounts();
  const accountName = new Map(accounts.map((a) => [a.id, a.nameArranged]));

  const all = await db.select().from(bdeFinancialEntries).orderBy(desc(bdeFinancialEntries.occurredOn), desc(bdeFinancialEntries.id));
  const entries = all.filter((e) => (!fiscalYearId || e.fiscalYearId === fiscalYearId) && (!direction || e.direction === direction) && (!category || e.category === category));
  const summary = summarizeFinance(entries);
  const byAccount = summarizeByAccount(entries, accounts, true);

  const qs = (params: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) u.set(k, v);
    const s = u.toString();
    return s ? `?${s}` : "";
  };
  const fyQs = qs({ fy: fiscalYearId ? String(fiscalYearId) : undefined });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/finances/nouvelle" className="btn"><Plus size={16} /> Nouvelle écriture</Link>
        <Link href={`/admin/finances/import${fyQs}`} className="btn-ghost"><Upload size={16} /> Importer un CSV</Link>
        <Link href={`/admin/finances/previsionnel${fyQs}`} className="btn-ghost"><TableProperties size={16} /> Prévisionnel</Link>
        <Link href={`/admin/finances/courbe${fyQs}`} className="btn-ghost"><LineChart size={16} /> Courbe</Link>
        <Link href={`/admin/finances/normal${fyQs}`} className="btn-ghost"><FileSpreadsheet size={16} /> Comptabilité normale</Link>
        <Link href={`/admin/finances/imprimer${fyQs}`} target="_blank" className="btn-ghost"><Printer size={16} /> Rapport (PDF)</Link>
        <Link href="/admin/comptabilite-parametres" className="btn-ghost ml-auto"><Settings2 size={16} /> Paramètres</Link>
      </div>

      <FinanceFilterForm fiscalYears={fiscalYears} fiscalYearId={fiscalYearId} direction={direction} category={category} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"><ArrowDownCircle size={20} /></span><div><div className="text-xs text-muted">Recettes</div><div className="text-xl font-bold tabular-nums">{fmtEuros(summary.incomeCents)}</div></div></div>
        <div className="card flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-500/15 text-red-600 dark:text-red-400"><ArrowUpCircle size={20} /></span><div><div className="text-xs text-muted">Dépenses</div><div className="text-xl font-bold tabular-nums">{fmtEuros(summary.expenseCents)}</div></div></div>
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

      {byAccount.length > 0 && (
        <div className="card p-0">
          <h2 className="border-b border-line px-4 py-3 font-semibold">Par compte</h2>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="px-4 py-1.5 font-medium">N°</th><th className="py-1.5 pr-3 font-medium">Compte</th><th className="px-2 py-1.5 text-right font-medium text-emerald-600 dark:text-emerald-400">Recettes</th><th className="px-4 py-1.5 text-right font-medium text-red-600 dark:text-red-400">Dépenses</th></tr></thead>
            <tbody className="divide-y divide-line">
              {byAccount.map((row) => (
                <tr key={row.id ?? "none"}><td className="px-4 py-1.5 text-muted">{row.number}</td><td className="py-1.5 pr-3">{row.name}</td><td className="px-2 py-1.5 text-right tabular-nums">{fmtEuros(row.incomeCents)}</td><td className="px-4 py-1.5 text-right tabular-nums">{fmtEuros(row.expenseCents)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="card p-0">
        <h2 className="border-b border-line px-4 py-3 font-semibold">Écritures ({summary.count})</h2>
        {entries.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">Aucune écriture pour ces filtres.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-line bg-bg text-left text-xs text-muted"><th className="px-4 py-1.5 font-medium">Date</th><th className="py-1.5 pr-3 font-medium">Libellé</th><th className="py-1.5 pr-3 font-medium">Poste</th><th className="py-1.5 pr-3 font-medium">Compte</th><th className="py-1.5 pr-3 text-right font-medium">Montant</th><th className="py-1.5 pr-4 font-medium" /></tr></thead>
              <tbody className="divide-y divide-line">
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap px-4 py-1.5">{dateFmt.format(new Date(`${e.occurredOn}T12:00:00`))}</td>
                    <td className="py-1.5 pr-3">
                      {e.label}{e.reference && <span className="block text-xs text-muted">Réf. {e.reference}</span>}
                      {e.invoiceUrl && <a href={e.invoiceUrl} target="_blank" className="ml-1 inline-flex items-center gap-0.5 text-xs text-accent hover:underline"><Paperclip size={11} /> Pièce</a>}
                    </td>
                    <td className="py-1.5 pr-3 text-muted">{CATEGORY_LABEL[e.category]}</td>
                    <td className="py-1.5 pr-3 text-muted">{e.accountingAccountId ? accountName.get(e.accountingAccountId) : "—"}</td>
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
