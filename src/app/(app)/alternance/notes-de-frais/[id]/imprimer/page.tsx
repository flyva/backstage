import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { expenseFiles, expenseNotes } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PrintButton } from "@/components/PrintButton";

export const metadata = { title: "Note de frais" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" });
const fmtEuros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

// Note de frais prête à imprimer ou enregistrer en PDF (photo du reçu + commentaire).
export default async function ExpenseNotePrintPage({ params }: PageProps<"/alternance/notes-de-frais/[id]/imprimer">) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [note] = await db.select().from(expenseNotes).where(and(eq(expenseNotes.id, id), eq(expenseNotes.userId, user.id))).limit(1);
  if (!note) notFound();
  const extra = await db.select({ id: expenseFiles.id }).from(expenseFiles).where(eq(expenseFiles.expenseNoteId, id)).orderBy(asc(expenseFiles.id));
  const photoSrcs = [`/api/alternance/notes-de-frais/${note.id}/photo`, ...extra.map((f) => `/api/alternance/notes-de-frais/${note.id}/photo/${f.id}`)];

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/alternance/notes-de-frais/${note.id}`} className="text-sm text-muted hover:text-fg">← Note de frais</Link>
        <PrintButton />
      </div>
      <header className="border-b border-line pb-3">
        <h1 className="text-2xl font-bold">Note de frais — {note.placeName || note.place}</h1>
        <p className="text-sm text-muted">{user.name} · {dateFmt.format(new Date(`${note.date}T12:00:00`))} à {note.time} ({note.moment === "soir" ? "soir" : "midi"}) · {fmtEuros(note.priceCents)}</p>
      </header>
      <p className="whitespace-pre-line text-sm">{note.comment}</p>
      {photoSrcs.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt={`Reçu ${i + 1}`} className="max-h-[70vh] w-full rounded-xl border border-line object-contain print:max-h-[22cm]" />
      ))}
    </div>
  );
}
