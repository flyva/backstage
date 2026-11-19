import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bdeBudgetForecasts, bdeFinancialEntries } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { DIRECTION_LABEL } from "@/lib/finance";
import { getAccountingAccounts, getFiscalYears } from "@/lib/finance-data";

// Export du prévisionnel (prévu / réalisé / écart) pour un exercice.
export async function GET(req: Request) {
  await requireAdmin();
  const sp = new URL(req.url).searchParams;
  const fiscalYears = await getFiscalYears();
  const current = fiscalYears.find((f) => f.isCurrent) ?? fiscalYears[0];
  const fyParam = Number(sp.get("fy"));
  const fiscalYear = fiscalYears.find((f) => f.id === fyParam) ?? current;
  if (!fiscalYear) return new Response("Aucun exercice", { status: 404 });

  const accounts = await getAccountingAccounts();
  const [forecasts, entries] = await Promise.all([
    db.select().from(bdeBudgetForecasts).where(eq(bdeBudgetForecasts.fiscalYearId, fiscalYear.id)),
    db.select().from(bdeFinancialEntries).where(eq(bdeFinancialEntries.fiscalYearId, fiscalYear.id)),
  ]);
  const realizedByKey = new Map<string, number>();
  for (const e of entries) {
    const key = `${e.accountingAccountId ?? 0}:${e.direction}`;
    realizedByKey.set(key, (realizedByKey.get(key) ?? 0) + e.amountCents);
  }

  const csv = toCsv(
    ["Sens", "N° compte", "Intitulé", "Prévu", "Réalisé", "Écart"],
    forecasts.map((f) => {
      const acc = accounts.find((a) => a.id === f.accountingAccountId);
      const realized = realizedByKey.get(`${f.accountingAccountId}:${f.direction}`) ?? 0;
      return [DIRECTION_LABEL[f.direction], acc?.number ?? "", acc?.nameNormal ?? "", (f.amountCents / 100).toFixed(2), (realized / 100).toFixed(2), ((realized - f.amountCents) / 100).toFixed(2)];
    }),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="previsionnel-${fiscalYear.label}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
