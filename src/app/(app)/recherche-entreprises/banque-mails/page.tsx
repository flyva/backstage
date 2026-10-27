import { Mail } from "lucide-react";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { emailBankEntries } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { EmailBankList, type EmailBankRow } from "@/components/EmailBankList";

export const metadata = { title: "Banque de mails · Recherche entreprises" };

export default async function EmailBankPage() {
  const user = await requireUser();
  const rows = await db.select().from(emailBankEntries).orderBy(asc(emailBankEntries.label));
  const entries: EmailBankRow[] = rows.map((r) => ({
    id: r.id, label: r.label, email: r.email, category: r.category, note: r.note,
    canDelete: user.perms.admin || r.createdByUserId === user.id,
  }));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Mail size={22} className="text-accent" /> Banque de mails</h1>
        <p className="text-sm text-muted">Contacts utiles (RH, casting, prod…) pour prospecter, partagés entre tous. Filtre par nom, email ou catégorie.</p>
      </header>
      <EmailBankList entries={entries} />
    </div>
  );
}
