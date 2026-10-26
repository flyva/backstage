import { Building2 } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { altCompanies, altCompanySearches } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { CompanyBoard, type BoardRow, type DirectoryRow } from "@/components/CompanyBoard";

export const metadata = { title: "Recherche entreprises" };

export default async function CompanySearchPage() {
  const user = await requireUser();
  const [companies, mySearches] = await Promise.all([
    db.select().from(altCompanies).orderBy(asc(altCompanies.name)),
    db.select().from(altCompanySearches).where(eq(altCompanySearches.userId, user.id)),
  ]);
  const companyById = new Map(companies.map((c) => [c.id, c]));
  const searchByCompanyId = new Map(mySearches.map((s) => [s.companyId, s]));

  const board: BoardRow[] = mySearches
    .map((s) => {
      const c = companyById.get(s.companyId);
      if (!c) return null;
      return {
        searchId: s.id, companyId: c.id, name: c.name, city: c.city, sector: c.sector, types: c.types, address: c.address,
        contactName: c.contactName, phone: c.phone, email: c.email,
        kind: s.kind, status: s.status, priority: s.priority, lastContactDate: s.lastContactDate, interviewDate: s.interviewDate,
        delayDays: s.delayDays, note: s.note,
      };
    })
    .filter((r): r is BoardRow => r !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  const directory: DirectoryRow[] = companies.map((c) => ({
    id: c.id, name: c.name, city: c.city, department: c.department, sector: c.sector, types: c.types, address: c.address,
    contactName: c.contactName, phone: c.phone, email: c.email, inBoard: searchByCompanyId.has(c.id),
  }));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Building2 size={22} className="text-accent" /> Recherche d&apos;entreprises</h1>
        <p className="text-sm text-muted">
          Un annuaire d&apos;entreprises partagé avec toute la promo, et ton propre tableau de suivi de candidatures (statut, priorité, relances…), rien que pour toi.
        </p>
      </header>
      <CompanyBoard board={board} directory={directory} />
    </div>
  );
}
