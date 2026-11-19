import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { bdeFinancialEntries } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { todayParis } from "@/lib/equipment";
import { getAccountingAccounts, getBankAccounts, getFiscalYears } from "@/lib/finance-data";
import { FinanceEntryForm } from "@/components/finance-forms";

export const metadata = { title: "Modifier l'écriture" };

export default async function EditFinancialEntryPage({ params }: PageProps<"/admin/finances/[id]/modifier">) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [entry] = await db.select().from(bdeFinancialEntries).where(eq(bdeFinancialEntries.id, id)).limit(1);
  if (!entry) notFound();
  const [accountingAccounts, bankAccounts, fiscalYears] = await Promise.all([getAccountingAccounts(), getBankAccounts(), getFiscalYears()]);

  return (
    <div className="max-w-xl space-y-4">
      <Link href="/admin/finances" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> Comptabilité</Link>
      <h2 className="text-xl font-semibold">Modifier l&apos;écriture</h2>
      <div className="card">
        <FinanceEntryForm
          today={todayParis()} id={entry.id} direction={entry.direction} category={entry.category}
          accountingAccountId={entry.accountingAccountId} bankAccountId={entry.bankAccountId} fiscalYearId={entry.fiscalYearId}
          label={entry.label} amount={entry.amountCents / 100} occurredOn={entry.occurredOn}
          method={entry.method ?? ""} reference={entry.reference ?? ""} notes={entry.notes ?? ""}
          accountingAccounts={accountingAccounts} bankAccounts={bankAccounts} fiscalYears={fiscalYears}
        />
      </div>
    </div>
  );
}
