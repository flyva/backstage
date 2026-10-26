import { Building2 } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { altCompanies, altCompanySearches } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { CompanyDirectory, type DirectoryRow } from "@/components/CompanyDirectory";

export const metadata = { title: "Annuaire · Recherche entreprises" };

export default async function CompanyDirectoryPage() {
  const user = await requireUser();
  const [companies, mySearches] = await Promise.all([
    db.select().from(altCompanies).orderBy(asc(altCompanies.name)),
    db.select({ companyId: altCompanySearches.companyId }).from(altCompanySearches).where(eq(altCompanySearches.userId, user.id)),
  ]);
  const inBoardIds = new Set(mySearches.map((s) => s.companyId));

  const directory: DirectoryRow[] = companies.map((c) => ({
    id: c.id, name: c.name, city: c.city, department: c.department, sector: c.sector, types: c.types, address: c.address,
    salary: c.salary, sources: c.sources, perks: c.perks,
    contactTitle: c.contactTitle, contactName: c.contactName, phone: c.phone, email: c.email, inBoard: inBoardIds.has(c.id),
    canDelete: user.perms.admin || c.createdByUserId === user.id,
  }));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Building2 size={22} className="text-accent" /> Annuaire des entreprises</h1>
        <p className="text-sm text-muted">Partagé avec toute la promo. Ajoute une entreprise à ton tableau sans toucher à celui des autres.</p>
      </header>
      <CompanyDirectory directory={directory} />
    </div>
  );
}
