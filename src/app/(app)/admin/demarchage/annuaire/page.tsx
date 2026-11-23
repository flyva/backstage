import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { CompanyCsvImportForm } from "@/components/CompanyCsvImportForm";

export const metadata = { title: "Import annuaire · Démarchage entreprise" };

export default async function AdminDemarchageAnnuairePage() {
  await requireAdmin();
  return (
    <div className="max-w-xl space-y-5">
      <p className="text-sm"><Link href="/admin/demarchage" className="text-muted underline">← Démarchage entreprise</Link></p>
      <header>
        <h1 className="text-2xl font-bold">Import de l&apos;annuaire</h1>
      </header>
      <CompanyCsvImportForm />
    </div>
  );
}
