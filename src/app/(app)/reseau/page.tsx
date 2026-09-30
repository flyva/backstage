import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { networkContacts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { NetworkBook } from "@/components/people-forms";

export const metadata = { title: "Carnet de réseau" };

export default async function ReseauPage() {
  const user = await requireUser();
  const rows = await db.select().from(networkContacts).where(eq(networkContacts.userId, user.id)).orderBy(asc(networkContacts.name));
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Carnet de réseau</h1>
        <p className="text-sm text-muted">Les contacts professionnels que tu rencontres. Ce carnet est personnel : personne d&apos;autre ne le voit.</p>
      </header>
      <NetworkBook contacts={rows.map((c) => ({ id: c.id, name: c.name, jobTitle: c.jobTitle, company: c.company, email: c.email, phone: c.phone, linkUrl: c.linkUrl, notes: c.notes }))} />
    </div>
  );
}
