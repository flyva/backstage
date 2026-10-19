import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { ArrowLeft, Download, Printer, Trash2 } from "lucide-react";
import { db } from "@/db";
import { expenseFiles, expenseNotes } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { deleteExpenseNote } from "@/lib/expense-actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CopyButton } from "@/components/people-forms";

export const metadata = { title: "Note de frais" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" });
const fmtEuros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export default async function ExpenseNotePage({ params }: PageProps<"/alternance/notes-de-frais/[id]">) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [note] = await db.select().from(expenseNotes).where(and(eq(expenseNotes.id, id), eq(expenseNotes.userId, user.id))).limit(1);
  if (!note) notFound();
  const extra = await db.select({ id: expenseFiles.id }).from(expenseFiles).where(eq(expenseFiles.expenseNoteId, id)).orderBy(asc(expenseFiles.id));
  const photos = [{ src: `/api/alternance/notes-de-frais/${note.id}/photo`, dl: `/api/alternance/notes-de-frais/${note.id}/photo?dl=1` }, ...extra.map((f) => ({ src: `/api/alternance/notes-de-frais/${note.id}/photo/${f.id}`, dl: `/api/alternance/notes-de-frais/${note.id}/photo/${f.id}?dl=1` }))];

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-sm"><Link href="/alternance/notes-de-frais" className="inline-flex items-center gap-1 text-muted hover:text-fg"><ArrowLeft size={14} /> Notes de frais</Link></p>
      <header>
        <h1 className="text-2xl font-bold">{note.placeName || note.place}</h1>
        {note.place && note.placeName && <p className="text-sm text-muted">{note.place}</p>}
        <p className="text-sm text-muted">{dateFmt.format(new Date(`${note.date}T12:00:00`))} à {note.time} · <span className="font-semibold text-fg">{fmtEuros(note.priceCents)}</span></p>
      </header>

      <div className={`grid gap-3 ${photos.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {photos.map((p, i) => (
          <div key={p.src} className="card p-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.src} alt={`Reçu ${i + 1}`} className="w-full rounded-xl object-contain" />
          </div>
        ))}
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Commentaire pour l&apos;entreprise</h2>
        <p className="whitespace-pre-line rounded-lg border border-line bg-bg p-3 text-sm">{note.comment}</p>
        <CopyButton value={note.comment} label="Copier le commentaire" />
      </div>

      <div className="flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <a key={p.dl} href={p.dl} className="btn-ghost">
            <Download size={15} /> {photos.length > 1 ? `Photo ${i + 1} (JPG)` : "Photo (JPG)"}
          </a>
        ))}
        <Link href={`/alternance/notes-de-frais/${note.id}/imprimer`} className="btn-ghost"><Printer size={15} /> PDF / Imprimer</Link>
        <form action={deleteExpenseNote} className="ml-auto">
          <input type="hidden" name="id" value={note.id} />
          <ConfirmButton message="Supprimer définitivement cette note de frais ?" className="btn-ghost text-danger">
            <Trash2 size={15} /> Supprimer
          </ConfirmButton>
        </form>
      </div>
    </div>
  );
}
