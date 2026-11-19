import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { bdeFinancialEntries } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { cumulativeBalance, fmtEuros, summarizeFinance } from "@/lib/finance";
import { getFiscalYears } from "@/lib/finance-data";
import { CourbeChart } from "@/components/CourbeChart";

export const metadata = { title: "Courbe de trésorerie" };

// Espace « courbe » : évolution du solde cumulé mois par mois sur l'exercice, pour voir la trésorerie d'un coup d'œil.
export default async function CourbePage({ searchParams }: PageProps<"/admin/finances/courbe">) {
  await requireAdmin();
  const sp = await searchParams;
  const fiscalYears = await getFiscalYears();
  const current = fiscalYears.find((f) => f.isCurrent) ?? fiscalYears[0];
  const fyParam = Number(sp.fy);
  const fiscalYear = fiscalYears.find((f) => f.id === fyParam) ?? current;

  const entries = fiscalYear ? await db.select().from(bdeFinancialEntries).where(eq(bdeFinancialEntries.fiscalYearId, fiscalYear.id)) : [];
  const summary = summarizeFinance(entries);
  const cumulative = cumulativeBalance(summary.byMonth, 0);

  return (
    <div className="max-w-3xl space-y-4">
      <Link href={`/admin/finances${fiscalYear ? `?fy=${fiscalYear.id}` : ""}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> Comptabilité</Link>
      <h2 className="text-xl font-semibold">Courbe de trésorerie — {fiscalYear?.label ?? "—"}</h2>
      <p className="text-sm text-muted">Solde cumulé depuis le début de l&apos;exercice, mois par mois (hors solde d&apos;ouverture des comptes bancaires).</p>
      <div className="card">
        <CourbeChart points={cumulative} />
        <p className="mt-2 text-sm text-muted">Solde en fin d&apos;exercice : <span className="font-semibold text-fg">{fmtEuros(cumulative[cumulative.length - 1] ?? 0)}</span></p>
      </div>
    </div>
  );
}
