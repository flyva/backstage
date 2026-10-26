import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { altCompanies, altCompanySearches } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { MyBoardTable, type BoardRow } from "@/components/MyBoardTable";

export const metadata = { title: "Mon tableau · Recherche entreprises" };

export default async function MyBoardPage() {
  const user = await requireUser();
  const mySearches = await db.select().from(altCompanySearches).where(eq(altCompanySearches.userId, user.id));
  const companies = mySearches.length
    ? await db.select().from(altCompanies).where(inArray(altCompanies.id, mySearches.map((s) => s.companyId)))
    : [];
  const companyById = new Map(companies.map((c) => [c.id, c]));

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

  return (
    <div className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><ClipboardList size={22} className="text-accent" /> Mon tableau</h1>
        <p className="text-sm text-muted">
          Ton suivi de candidatures (statut, priorité, relances…), rien que pour toi. Ajoute des entreprises depuis l&apos;<Link href="/recherche-entreprises/annuaire" className="text-accent underline">annuaire</Link>.
        </p>
      </header>
      <MyBoardTable board={board} />
    </div>
  );
}
