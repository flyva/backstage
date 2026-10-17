import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Plus, Receipt } from "lucide-react";
import { db } from "@/db";
import { expenseNotes } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Notes de frais" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", year: "numeric" });
const fmtEuros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export default async function ExpenseNotesPage() {
  const user = await requireUser();
  const notes = await db.select().from(expenseNotes).where(eq(expenseNotes.userId, user.id)).orderBy(desc(expenseNotes.date), desc(expenseNotes.id));
  const total = notes.reduce((s, n) => s + n.priceCents, 0);

  return (
    <div className="max-w-2xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Receipt size={22} className="text-accent" /> Notes de frais</h1>
          <p className="text-sm text-muted">{notes.length} note(s) · {fmtEuros(total)} au total</p>
        </div>
        <Link href="/alternance/notes-de-frais/nouveau" className="btn"><Plus size={15} /> Nouvelle note</Link>
      </header>

      {notes.length === 0 && <div className="card text-sm text-muted">Aucune note de frais pour l&apos;instant. Prends ton reçu en photo pour en ajouter une.</div>}

      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.id}>
            <Link href={`/alternance/notes-de-frais/${n.id}`} className="card flex items-center gap-3 p-4 hover:border-accent">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/alternance/notes-de-frais/${n.id}/photo`} alt="" className="size-14 shrink-0 rounded-lg border border-line object-cover" loading="lazy" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-medium">{n.place}</span>
                  <span className="shrink-0 font-semibold tabular-nums">{fmtEuros(n.priceCents)}</span>
                </div>
                <div className="text-sm text-muted">{dateFmt.format(new Date(`${n.date}T12:00:00`))} à {n.time}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
