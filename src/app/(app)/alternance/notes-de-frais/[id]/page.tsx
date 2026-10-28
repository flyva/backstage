import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { ArrowLeft, Download, Pencil, Printer, Trash2 } from "lucide-react";
import { db } from "@/db";
import { expenseFiles, expenseNotes } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { deleteExpenseNote } from "@/lib/expense-actions";
import { EXPENSE_MOMENT_LABEL, TVA_RATE_LABEL, TVA_RATES, trDeductionFor } from "@/lib/alternance";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CopyButton } from "@/components/people-forms";
import { ExpensePhotoGallery, FieldRow } from "@/components/ExpenseNoteDetail";

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

  const resto = { maxDayCents: user.restoMaxDayCents, maxMealCents: user.restoMaxMealCents, trCents: user.restoTrCents, trMoment: user.restoTrMoment, autreCents: user.restoAutreCents };
  const trDeduction = trDeductionFor(note.moment, resto);
  const priceWithoutTr = trDeduction !== null ? Math.max(0, note.priceCents - trDeduction) : null;
  const tvaLabel = note.tvaCents === null ? "" : `${fmtEuros(note.tvaCents)}${note.tvaRate ? ` (${TVA_RATE_LABEL[note.tvaRate as (typeof TVA_RATES)[number]]})` : ""}`;

  return (
    <div className="max-w-5xl space-y-4">
      <p className="text-sm"><Link href="/alternance/notes-de-frais" className="inline-flex items-center gap-1 text-muted hover:text-fg"><ArrowLeft size={14} /> Notes de frais</Link></p>
      <header>
        <h1 className="text-2xl font-bold">{note.placeName || note.place}</h1>
        {note.place && note.placeName && <p className="text-sm text-muted">{note.place}</p>}
        <p className="text-sm text-muted">
          {dateFmt.format(new Date(`${note.date}T12:00:00`))} à {note.time}
          {" · "}<span className="rounded-full border border-line px-2 py-0.5 text-xs">{EXPENSE_MOMENT_LABEL[note.moment]}</span>
          {" · "}<span className="font-semibold text-fg">{fmtEuros(note.priceCents)}</span>
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="card p-3">
          <ExpensePhotoGallery photos={photos} />
        </div>

        <div className="space-y-4">
          <div className="card">
            <h2 className="mb-1 font-semibold">Détails</h2>
            <FieldRow label="Date" value={dateFmt.format(new Date(`${note.date}T12:00:00`))} />
            <FieldRow label="Nom" value={note.placeName} />
            <FieldRow label="Adresse" value={note.place} />
            <FieldRow label="Numéro d'affaire" value={note.businessNumber} />
            <FieldRow label="Heure" value={note.time} />
            <FieldRow label="Prix TTC" value={fmtEuros(note.priceCents)} />
            {priceWithoutTr !== null && <FieldRow label="Prix sans ticket-restaurant" value={fmtEuros(priceWithoutTr)} />}
            <FieldRow label="TVA" value={tvaLabel} />
            <FieldRow label="Commentaire" value={note.extraComment} />
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold">Commentaire pour l&apos;entreprise</h2>
            <p className="whitespace-pre-line rounded-lg border border-line bg-bg p-3 text-sm">{note.comment}</p>
            <CopyButton value={note.comment} label="Copier le commentaire" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <a key={p.dl} href={p.dl} className="btn-ghost">
            <Download size={15} /> {photos.length > 1 ? `Photo ${i + 1} (JPG)` : "Photo (JPG)"}
          </a>
        ))}
        <Link href={`/alternance/notes-de-frais/${note.id}/modifier`} className="btn-ghost"><Pencil size={15} /> Modifier</Link>
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
