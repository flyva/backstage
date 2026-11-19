import { desc } from "drizzle-orm";
import { db } from "@/db";
import { bdeFinancialEntries } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { DIRECTION_LABEL } from "@/lib/finance";
import { getAccountingAccounts, getFiscalYears } from "@/lib/finance-data";

// Export de l'exercice avec les noms de compte officiels (DAF / impôts), mêmes colonnes que le modèle d'import.
export async function GET(req: Request) {
  await requireAdmin();
  const sp = new URL(req.url).searchParams;
  const fiscalYears = await getFiscalYears();
  const current = fiscalYears.find((f) => f.isCurrent) ?? fiscalYears[0];
  const fyParam = Number(sp.get("fy"));
  const fiscalYear = fiscalYears.find((f) => f.id === fyParam) ?? current;

  const accounts = await getAccountingAccounts();
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const all = await db.select().from(bdeFinancialEntries).orderBy(desc(bdeFinancialEntries.occurredOn));
  const entries = fiscalYear ? all.filter((e) => e.fiscalYearId === fiscalYear.id) : all;

  const csv = toCsv(
    ["Date", "Libellé", "Sens", "Montant", "N° compte", "Intitulé compte", "Référence", "Moyen de paiement", "Notes"],
    entries.map((e) => {
      const acc = e.accountingAccountId ? accountById.get(e.accountingAccountId) : undefined;
      return [e.occurredOn, e.label, DIRECTION_LABEL[e.direction], (e.amountCents / 100).toFixed(2), acc?.number ?? "", acc?.nameNormal ?? "Non classé", e.reference ?? "", e.method ?? "", e.notes ?? ""];
    }),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="exercice-${fiscalYear?.label ?? "export"}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
