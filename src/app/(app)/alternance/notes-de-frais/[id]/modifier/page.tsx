import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { ArrowLeft, Receipt } from "lucide-react";
import { db } from "@/db";
import { expenseFiles, expenseNotes } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ExpenseNoteForm, type ExpExistingPhoto } from "@/components/alternance-forms";

export const metadata = { title: "Modifier la note de frais" };

export default async function EditExpenseNotePage({ params }: PageProps<"/alternance/notes-de-frais/[id]/modifier">) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [note] = await db.select().from(expenseNotes).where(and(eq(expenseNotes.id, id), eq(expenseNotes.userId, user.id))).limit(1);
  if (!note) notFound();
  const extra = await db.select({ id: expenseFiles.id }).from(expenseFiles).where(eq(expenseFiles.expenseNoteId, id)).orderBy(asc(expenseFiles.id));

  const existingPhotos: ExpExistingPhoto[] = [
    { key: "main", url: `/api/alternance/notes-de-frais/${id}/photo`, kind: "main", fileId: null },
    ...extra.map((f) => ({ key: `e${f.id}`, url: `/api/alternance/notes-de-frais/${id}/photo/${f.id}`, kind: "extra" as const, fileId: f.id })),
  ];

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-sm"><Link href={`/alternance/notes-de-frais/${id}`} className="inline-flex items-center gap-1 text-muted hover:text-fg"><ArrowLeft size={14} /> Note de frais</Link></p>
      <h1 className="flex items-center gap-2 text-2xl font-bold"><Receipt size={22} className="text-accent" /> Modifier la note de frais</h1>
      <div className="card">
        <ExpenseNoteForm
          today={note.date} now={note.time} day={note.date} moment={note.moment}
          id={note.id} time={note.time} price={note.priceCents / 100} placeName={note.placeName} place={note.place}
          existingPhotos={existingPhotos}
        />
      </div>
    </div>
  );
}
