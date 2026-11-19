import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import { db } from "@/db";
import { bdeBudgetForecasts, bdeFinancialEntries } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { DIRECTION_LABEL, fmtEuros } from "@/lib/finance";
import { getAccountingAccounts, getFiscalYears } from "@/lib/finance-data";
import { deleteBudgetForecast } from "@/lib/finance-actions";
import { BudgetForecastForm } from "@/components/finance-forms";
import { ConfirmButton } from "@/components/ConfirmButton";

export const metadata = { title: "Prévisionnel" };

// Espace prévisionnel : montant attendu par compte comptable sur l'exercice, comparé au réalisé.
export default async function BudgetForecastPage({ searchParams }: PageProps<"/admin/finances/previsionnel">) {
  await requireAdmin();
  const sp = await searchParams;
  const fiscalYears = await getFiscalYears();
  const current = fiscalYears.find((f) => f.isCurrent) ?? fiscalYears[0];
  const fyParam = Number(sp.fy);
  const fiscalYear = fiscalYears.find((f) => f.id === fyParam) ?? current;
  const accounts = await getAccountingAccounts();

  if (!fiscalYear) {
    return (
      <div className="max-w-xl space-y-4">
        <Link href="/admin/finances" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> Comptabilité</Link>
        <p className="text-sm text-muted">Crée d&apos;abord un exercice dans les paramètres comptabilité.</p>
      </div>
    );
  }

  const [forecasts, entries] = await Promise.all([
    db.select().from(bdeBudgetForecasts).where(eq(bdeBudgetForecasts.fiscalYearId, fiscalYear.id)),
    db.select().from(bdeFinancialEntries).where(eq(bdeFinancialEntries.fiscalYearId, fiscalYear.id)),
  ]);
  const realizedByKey = new Map<string, number>();
  for (const e of entries) {
    const key = `${e.accountingAccountId ?? 0}:${e.direction}`;
    realizedByKey.set(key, (realizedByKey.get(key) ?? 0) + e.amountCents);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/admin/finances?fy=${fiscalYear.id}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> Comptabilité</Link>
        <a href={`/admin/finances/export/previsionnel?fy=${fiscalYear.id}`} className="btn-ghost"><Download size={16} /> Exporter (CSV)</a>
      </div>
      <h2 className="text-xl font-semibold">Prévisionnel — {fiscalYear.label}</h2>

      <section className="card space-y-3">
        <h3 className="font-semibold">Ajouter une ligne</h3>
        <BudgetForecastForm fiscalYearId={fiscalYear.id} accountingAccounts={accounts} />
      </section>

      <div className="card p-0">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-line bg-bg text-left text-xs text-muted"><th className="px-4 py-1.5 font-medium">Sens</th><th className="py-1.5 pr-3 font-medium">Compte</th><th className="py-1.5 pr-3 text-right font-medium">Prévu</th><th className="py-1.5 pr-3 text-right font-medium">Réalisé</th><th className="py-1.5 pr-3 text-right font-medium">Écart</th><th className="py-1.5 pr-4 font-medium" /></tr></thead>
          <tbody className="divide-y divide-line">
            {forecasts.length === 0 && <tr><td colSpan={6} className="px-4 py-4 text-center text-muted">Aucune ligne prévisionnelle.</td></tr>}
            {forecasts.map((f) => {
              const acc = accounts.find((a) => a.id === f.accountingAccountId);
              const realized = realizedByKey.get(`${f.accountingAccountId}:${f.direction}`) ?? 0;
              const gap = realized - f.amountCents;
              return (
                <tr key={f.id}>
                  <td className="px-4 py-1.5">{DIRECTION_LABEL[f.direction]}</td>
                  <td className="py-1.5 pr-3">{acc ? `${acc.number} — ${acc.nameArranged}` : "—"}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{fmtEuros(f.amountCents)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{fmtEuros(realized)}</td>
                  <td className={`py-1.5 pr-3 text-right tabular-nums ${gap >= 0 === (f.direction === "income") ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{gap >= 0 ? "+ " : "− "}{fmtEuros(Math.abs(gap))}</td>
                  <td className="py-1.5 pr-4">
                    <form action={deleteBudgetForecast}>
                      <input type="hidden" name="id" value={f.id} />
                      <ConfirmButton message="Supprimer cette ligne prévisionnelle ?" className="text-muted hover:text-danger"><Trash2 size={14} /></ConfirmButton>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
