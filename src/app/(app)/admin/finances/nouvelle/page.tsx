import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { todayParis } from "@/lib/equipment";
import { getAccountingAccounts, getBankAccounts, getFiscalYears } from "@/lib/finance-data";
import { FinanceEntryForm } from "@/components/finance-forms";

export const metadata = { title: "Nouvelle écriture comptable" };

export default async function NewFinancialEntryPage() {
  await requireAdmin();
  const [accountingAccounts, bankAccounts, fiscalYears] = await Promise.all([getAccountingAccounts(), getBankAccounts(), getFiscalYears()]);
  return (
    <div className="max-w-xl space-y-4">
      <Link href="/admin/finances" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> Comptabilité</Link>
      <h2 className="text-xl font-semibold">Nouvelle écriture comptable</h2>
      <div className="card">
        <FinanceEntryForm today={todayParis()} accountingAccounts={accountingAccounts} bankAccounts={bankAccounts} fiscalYears={fiscalYears} />
      </div>
    </div>
  );
}
