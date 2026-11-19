import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { bdeFinancialEntries } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { CATEGORY_LABEL, fmtEuros, summarizeFinance } from "@/lib/finance";
import { getFiscalYears } from "@/lib/finance-data";
import { PrintButton } from "@/components/PrintButton";

export const metadata = { title: "Rapport financier" };

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" });

// Rapport financier annuel (recettes/dépenses, par poste, par mois, détail des écritures) : même contenu que le
// rapport PDF d'Oasis, destiné à l'assemblée générale et aux demandes de subventions. Rattaché à un exercice.
export default async function FinancesPrintPage({ searchParams }: PageProps<"/admin/finances/imprimer">) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const fiscalYears = await getFiscalYears();
  const current = fiscalYears.find((f) => f.isCurrent) ?? fiscalYears[0];
  const fyParam = Number(sp.fy);
  const fiscalYear = fiscalYears.find((f) => f.id === fyParam) ?? current;

  const all = await db.select().from(bdeFinancialEntries).orderBy(desc(bdeFinancialEntries.occurredOn));
  const entries = (fiscalYear ? all.filter((e) => e.fiscalYearId === fiscalYear.id) : all).reverse();
  const summary = summarizeFinance(entries);
  const generatedAt = new Date();

  return (
    <div className="mx-auto max-w-4xl space-y-5 print:max-w-none">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/admin/finances${fiscalYear ? `?fy=${fiscalYear.id}` : ""}`} className="text-sm text-muted hover:text-fg">← Comptabilité</Link>
        <PrintButton />
      </div>
      <header className="border-b border-line pb-3">
        <h1 className="text-2xl font-bold">Rapport financier {fiscalYear?.label ?? ""}</h1>
        <p className="text-sm text-muted">BDE · Document établi le {dateFmt.format(generatedAt)} par {admin.name} — destiné à l&apos;assemblée générale et aux demandes de subventions.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-line p-3"><div className="text-xs text-muted">Total des crédits</div><div className="font-bold text-emerald-700 dark:text-emerald-400">{fmtEuros(summary.incomeCents)}</div></div>
        <div className="rounded-xl border border-line p-3"><div className="text-xs text-muted">Total des débits</div><div className="font-bold text-red-700 dark:text-red-400">{fmtEuros(summary.expenseCents)}</div></div>
        <div className="rounded-xl border border-line p-3"><div className="text-xs text-muted">Résultat de l&apos;exercice</div><div className={`font-bold ${summary.balanceCents >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>{fmtEuros(summary.balanceCents)}</div></div>
        <div className="rounded-xl border border-line p-3"><div className="text-xs text-muted">dont subventions</div><div className="font-bold text-emerald-700 dark:text-emerald-400">{fmtEuros(summary.subventionsCents)}</div></div>
      </div>

      <section>
        <h2 className="mb-1 border-b border-line pb-1 font-semibold">Compte de résultat par poste</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-line text-left text-xs text-muted"><th className="py-1 pr-2 font-medium">Poste analytique</th><th className="py-1 pr-2 text-right font-medium">Crédits</th><th className="py-1 pr-2 text-right font-medium">Débits</th><th className="py-1 text-right font-medium">Solde</th></tr></thead>
          <tbody className="divide-y divide-line">
            {summary.byCategory.length === 0 && <tr><td colSpan={4} className="py-3 text-center text-muted">Aucune écriture sur l&apos;exercice.</td></tr>}
            {summary.byCategory.map((row) => (
              <tr key={row.key}>
                <td className="py-1 pr-2">{row.label}</td>
                <td className="py-1 pr-2 text-right tabular-nums">{fmtEuros(row.incomeCents)}</td>
                <td className="py-1 pr-2 text-right tabular-nums">{fmtEuros(row.expenseCents)}</td>
                <td className="py-1 text-right tabular-nums">{fmtEuros(row.incomeCents - row.expenseCents)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t border-line font-semibold"><td className="py-1 pr-2">Total</td><td className="py-1 pr-2 text-right tabular-nums">{fmtEuros(summary.incomeCents)}</td><td className="py-1 pr-2 text-right tabular-nums">{fmtEuros(summary.expenseCents)}</td><td className="py-1 text-right tabular-nums">{fmtEuros(summary.balanceCents)}</td></tr></tfoot>
        </table>
      </section>

      <section>
        <h2 className="mb-1 border-b border-line pb-1 font-semibold">Évolution mensuelle</h2>
        <table className="w-full text-xs">
          <thead><tr className="border-b border-line text-left text-muted"><th className="py-1 pr-2 font-medium">Mois</th>{MONTHS.map((m) => <th key={m} className="py-1 pr-2 text-right font-medium">{m.slice(0, 1)}</th>)}</tr></thead>
          <tbody>
            <tr><td className="py-1 pr-2">Crédits</td>{summary.byMonth.map((m, i) => <td key={i} className="py-1 pr-2 text-right tabular-nums">{Math.round(m.incomeCents / 100)}</td>)}</tr>
            <tr><td className="py-1 pr-2">Débits</td>{summary.byMonth.map((m, i) => <td key={i} className="py-1 pr-2 text-right tabular-nums">{Math.round(m.expenseCents / 100)}</td>)}</tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-1 border-b border-line pb-1 font-semibold">Détail des écritures ({summary.count})</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-line text-left text-xs text-muted"><th className="py-1 pr-2 font-medium">Date</th><th className="py-1 pr-2 font-medium">Libellé</th><th className="py-1 pr-2 font-medium">Poste</th><th className="py-1 pr-2 text-right font-medium">Crédit</th><th className="py-1 text-right font-medium">Débit</th></tr></thead>
          <tbody className="divide-y divide-line">
            {entries.map((e) => (
              <tr key={e.id} className="break-inside-avoid">
                <td className="py-1 pr-2 whitespace-nowrap">{dateFmt.format(new Date(`${e.occurredOn}T12:00:00`))}</td>
                <td className="py-1 pr-2">{e.label}{e.reference && <span className="text-muted"> (réf. {e.reference})</span>}</td>
                <td className="py-1 pr-2 text-muted">{CATEGORY_LABEL[e.category]}</td>
                <td className="py-1 pr-2 text-right tabular-nums">{e.direction === "income" ? fmtEuros(e.amountCents) : ""}</td>
                <td className="py-1 text-right tabular-nums">{e.direction === "expense" ? fmtEuros(e.amountCents) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="border-t border-line pt-2 text-xs text-muted">Rapport généré depuis Backstage. Montants en euros.</p>
    </div>
  );
}
