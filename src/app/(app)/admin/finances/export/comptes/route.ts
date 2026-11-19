import { requireAdmin } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { getAccountingAccounts } from "@/lib/finance-data";

// Export du plan comptable (numéro, nom officiel, nom simplifié).
export async function GET() {
  await requireAdmin();
  const accounts = await getAccountingAccounts();
  const csv = toCsv(
    ["N° compte", "Nom officiel", "Nom simplifié"],
    accounts.map((a) => [a.number, a.nameNormal, a.nameArranged]),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"plan-comptable.csv\"",
      "Cache-Control": "private, no-store",
    },
  });
}
