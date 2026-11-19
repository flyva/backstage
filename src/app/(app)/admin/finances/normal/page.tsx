import Link from "next/link";
import { desc } from "drizzle-orm";
import { ArrowLeft, Download } from "lucide-react";
import { db } from "@/db";
import { bdeFinancialEntries } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { fmtEuros, summarizeByAccount } from "@/lib/finance";
import { getAccountingAccounts, getFiscalYears } from "@/lib/finance-data";

export const metadata = { title: "Comptabilité normale" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" });

// Vue « officielle » du tableau de comptabilité : numéros et noms de comptes normaux (plan comptable), pas les
// noms simplifiés du tableau général — destinée aux impôts / au directeur financier de l'école.
export default async function NormalFinancesPage({ searchParams }: PageProps<"/admin/finances/normal">) {
  await requireAdmin();
  const sp = await searchParams;
  const fiscalYears = await getFiscalYears();
  const current = fiscalYears.find((f) => f.isCurrent) ?? fiscalYears[0];
  const fyParam = Number(sp.fy);
  const fiscalYear = fiscalYears.find((f) => f.id === fyParam) ?? current;

  const accounts = await getAccountingAccounts();
  const all = await db.select().from(bdeFinancialEntries).orderBy(desc(bdeFinancialEntries.occurredOn));
  const entries = fiscalYear ? all.filter((e) => e.fiscalYearId === fiscalYear.id) : all;
  const byAccount = summarizeByAccount(entries, accounts, false);
  const totalIncome = byAccount.reduce((s, r) => s + r.incomeCents, 0);
  const totalExpense = byAccount.reduce((s, r) => s + r.expenseCents, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/admin/finances${fiscalYear ? `?fy=${fiscalYear.id}` : ""}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> Comptabilité</Link>
        <a href={`/admin/finances/export/exercice${fiscalYear ? `?fy=${fiscalYear.id}` : ""}`} className="btn-ghost"><Download size={16} /> Exporter (CSV)</a>
      </div>
      <h2 className="text-xl font-semibold">Comptabilité normale — {fiscalYear?.label ?? "tous exercices"}</h2>
      <p className="text-sm text-muted">Mêmes écritures que le tableau général, avec les numéros et libellés de compte officiels.</p>

      <div className="card p-0">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-line bg-bg text-left text-xs text-muted"><th className="px-4 py-1.5 font-medium">N° compte</th><th className="py-1.5 pr-3 font-medium">Intitulé</th><th className="py-1.5 pr-3 text-right font-medium text-emerald-600 dark:text-emerald-400">Recettes</th><th className="py-1.5 pr-4 text-right font-medium text-red-600 dark:text-red-400">Dépenses</th></tr></thead>
          <tbody className="divide-y divide-line">
            {byAccount.length === 0 && <tr><td colSpan={4} className="px-4 py-4 text-center text-muted">Aucune écriture.</td></tr>}
            {byAccount.map((row) => (
              <tr key={row.id ?? "none"}><td className="px-4 py-1.5 text-muted">{row.number}</td><td className="py-1.5 pr-3">{row.name}</td><td className="py-1.5 pr-3 text-right tabular-nums">{fmtEuros(row.incomeCents)}</td><td className="py-1.5 pr-4 text-right tabular-nums">{fmtEuros(row.expenseCents)}</td></tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t border-line font-semibold"><td className="px-4 py-1.5" colSpan={2}>Total</td><td className="py-1.5 pr-3 text-right tabular-nums">{fmtEuros(totalIncome)}</td><td className="py-1.5 pr-4 text-right tabular-nums">{fmtEuros(totalExpense)}</td></tr></tfoot>
        </table>
      </div>

      <div className="card p-0">
        <h3 className="border-b border-line px-4 py-3 font-semibold">Détail des écritures ({entries.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="px-4 py-1.5 font-medium">Date</th><th className="py-1.5 pr-3 font-medium">N° compte</th><th className="py-1.5 pr-3 font-medium">Intitulé</th><th className="py-1.5 pr-3 font-medium">Libellé</th><th className="py-1.5 pr-4 text-right font-medium">Montant</th></tr></thead>
            <tbody className="divide-y divide-line">
              {entries.map((e) => {
                const acc = accounts.find((a) => a.id === e.accountingAccountId);
                return (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap px-4 py-1.5">{dateFmt.format(new Date(`${e.occurredOn}T12:00:00`))}</td>
                    <td className="py-1.5 pr-3 text-muted">{acc?.number ?? "—"}</td>
                    <td className="py-1.5 pr-3 text-muted">{acc?.nameNormal ?? "Non classé"}</td>
                    <td className="py-1.5 pr-3">{e.label}</td>
                    <td className={`py-1.5 pr-4 text-right tabular-nums ${e.direction === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{e.direction === "income" ? "+ " : "− "}{fmtEuros(e.amountCents)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
