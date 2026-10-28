import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { expenseFiles, expenseNotes } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PrintButton } from "@/components/PrintButton";
import { EXPENSE_MOMENT_LABEL, TVA_RATE_LABEL, TVA_RATES, trDeductionFor } from "@/lib/alternance";

export const metadata = { title: "Note de frais" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" });
const fmtEuros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-line py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

// Note de frais prête à imprimer ou enregistrer en PDF : infos structurées + reçu(s), mise en page simple et sobre
// pour qu'elle reste lisible une fois imprimée (pas de couleurs de fond, pas de grille qui déborde).
export default async function ExpenseNotePrintPage({ params }: PageProps<"/alternance/notes-de-frais/[id]/imprimer">) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [note] = await db.select().from(expenseNotes).where(and(eq(expenseNotes.id, id), eq(expenseNotes.userId, user.id))).limit(1);
  if (!note) notFound();
  const extra = await db.select({ id: expenseFiles.id }).from(expenseFiles).where(eq(expenseFiles.expenseNoteId, id)).orderBy(asc(expenseFiles.id));
  const photoSrcs = [`/api/alternance/notes-de-frais/${note.id}/photo`, ...extra.map((f) => `/api/alternance/notes-de-frais/${note.id}/photo/${f.id}`)];

  const resto = { maxDayCents: user.restoMaxDayCents, maxMealCents: user.restoMaxMealCents, trCents: user.restoTrCents, trMoment: user.restoTrMoment, autreCents: user.restoAutreCents };
  const trDeduction = trDeductionFor(note.moment, resto);
  const priceWithoutTr = trDeduction !== null ? Math.max(0, note.priceCents - trDeduction) : null;
  const tvaLabel = note.tvaCents === null ? "" : `${fmtEuros(note.tvaCents)}${note.tvaRate ? ` (${TVA_RATE_LABEL[note.tvaRate as (typeof TVA_RATES)[number]]})` : ""}`;

  return (
    <div className="mx-auto max-w-2xl space-y-5 print:max-w-none">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/alternance/notes-de-frais/${note.id}`} className="text-sm text-muted hover:text-fg">← Note de frais</Link>
        <PrintButton />
      </div>
      <header className="border-b border-line pb-3">
        <h1 className="text-2xl font-bold">Note de frais — {note.placeName || note.place}</h1>
        <p className="text-sm text-muted">{user.name} · {dateFmt.format(new Date(`${note.date}T12:00:00`))} à {note.time} ({EXPENSE_MOMENT_LABEL[note.moment].toLowerCase()})</p>
      </header>

      <div className="rounded-xl border border-line p-3 print:border-black print:p-0">
        <InfoRow label="Date" value={dateFmt.format(new Date(`${note.date}T12:00:00`))} />
        <InfoRow label="Nom" value={note.placeName} />
        <InfoRow label="Adresse" value={note.place} />
        <InfoRow label="Heure" value={note.time} />
        <InfoRow label="Prix TTC" value={fmtEuros(note.priceCents)} />
        {priceWithoutTr !== null && <InfoRow label="Prix sans ticket-restaurant" value={fmtEuros(priceWithoutTr)} />}
        <InfoRow label="TVA" value={tvaLabel} />
      </div>

      {note.extraComment && (
        <div>
          <h2 className="mb-1 text-sm font-semibold">Commentaire</h2>
          <p className="whitespace-pre-line text-sm">{note.extraComment}</p>
        </div>
      )}

      <div className="space-y-3">
        {photoSrcs.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} src={src} alt={`Reçu ${i + 1}`} className="max-h-[80vh] w-full rounded-xl border border-line object-contain print:max-h-[24cm] print:break-inside-avoid" />
        ))}
      </div>
    </div>
  );
}
