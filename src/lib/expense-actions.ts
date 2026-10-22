"use server";

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { expenseFiles, expenseNotes, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ensureExpenseFilesDir, expenseFilesDir, MAX_EXPENSE_PHOTO_BYTES, newExpenseFileName, removeExpensePhoto, sniffExpensePhoto } from "@/lib/expense-files";
import { allow } from "@/lib/rate-limit";
import type { FormState } from "@/lib/actions";

const fmtEuros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" });

/** Commentaire prêt à copier-coller pour la note de frais, avec la précision facultative ajoutée à la fin. */
function buildExpenseComment(name: string, date: string, time: string, placeName: string, place: string, cents: number, extra: string) {
  const base = `Note de frais de ${name} : ${fmtEuros(cents)} dépensés le ${dateFmt.format(new Date(`${date}T12:00:00`))} à ${time}, à ${placeName}${place ? ` (${place})` : ""}.`;
  return extra ? `${base} ${extra}` : base;
}

export async function saveExpenseNote(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const date = String(fd.get("date") ?? "");
  const time = String(fd.get("time") ?? "");
  const moment = fd.get("moment") === "soir" ? "soir" : "midi";
  const placeName = String(fd.get("placeName") ?? "").trim();
  const place = String(fd.get("place") ?? "").trim();
  const extraComment = String(fd.get("comment") ?? "").trim().slice(0, 500);
  const euros = Number(String(fd.get("price") ?? "").replace(",", "."));
  const photos = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Date invalide" };
  if (!/^\d{2}:\d{2}$/.test(time)) return { error: "Heure invalide" };
  if (!placeName) return { error: "Indique le nom du lieu" };
  if (!Number.isFinite(euros) || euros <= 0 || euros > 100000) return { error: "Prix invalide" };
  if (photos.length === 0) return { error: "Ajoute au moins une photo du reçu" };
  if (photos.length > 10) return { error: "10 photos maximum par note" };
  const tooBig = photos.find((p) => p.size > MAX_EXPENSE_PHOTO_BYTES);
  if (tooBig) return { error: `« ${tooBig.name} » dépasse 15 Mo` };
  if (!allow(`expense:${user.id}`, 30, 60 * 60e3)) return { error: "Trop de notes de frais : réessaie plus tard." };

  await ensureExpenseFilesDir();
  const names: string[] = [];
  for (const photo of photos) {
    const bytes = new Uint8Array(await photo.arrayBuffer());
    const kind = sniffExpensePhoto(bytes);
    if (!kind) return { error: "Les photos doivent être au format JPG ou PNG" };
    const name = newExpenseFileName(kind.ext);
    await writeFile(path.join(expenseFilesDir(), name), bytes);
    names.push(name);
  }

  const priceCents = Math.round(euros * 100);
  const comment = buildExpenseComment(user.name, date, time, placeName, place, priceCents, extraComment);
  const [res] = await db.insert(expenseNotes).values({ userId: user.id, photoFile: names[0], date, time, moment, placeName, place, priceCents, comment });
  const extraNames = names.slice(1);
  if (extraNames.length) await db.insert(expenseFiles).values(extraNames.map((fileName) => ({ expenseNoteId: res.insertId, fileName })));

  revalidatePath("/alternance/notes-de-frais");
  redirect(`/alternance/notes-de-frais/${res.insertId}`);
}

export async function deleteExpenseNote(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  const [row] = await db.select({ userId: expenseNotes.userId, photoFile: expenseNotes.photoFile }).from(expenseNotes).where(eq(expenseNotes.id, id)).limit(1);
  if (!row || row.userId !== user.id) return;
  const extra = await db.select({ fileName: expenseFiles.fileName }).from(expenseFiles).where(eq(expenseFiles.expenseNoteId, id));
  await removeExpensePhoto(row.photoFile);
  for (const f of extra) await removeExpensePhoto(f.fileName);
  await db.delete(expenseNotes).where(eq(expenseNotes.id, id)); // efface aussi expenseFiles (ON DELETE CASCADE)
  revalidatePath("/alternance/notes-de-frais");
  redirect("/alternance/notes-de-frais");
}

// ---------- Réglages restauration (propres à chaque personne : contrat/plafonds différents selon l'entreprise) ----------

const restoSettingsSchema = z.object({
  maxDay: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(0).max(1000).nullable()),
  maxMeal: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(0).max(1000).nullable()),
  tr: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(0).max(1000).nullable()),
  trMoment: z.enum(["midi", "soir", "les_deux"]),
});

export async function saveRestoSettings(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const p = restoSettingsSchema.safeParse({
    maxDay: fd.get("maxDay"), maxMeal: fd.get("maxMeal"), tr: fd.get("tr"), trMoment: fd.get("trMoment"),
  });
  if (!p.success) return { error: p.error.issues[0].message };
  await db.update(users).set({
    restoMaxDayCents: p.data.maxDay === null ? null : Math.round(p.data.maxDay * 100),
    restoMaxMealCents: p.data.maxMeal === null ? null : Math.round(p.data.maxMeal * 100),
    restoTrCents: p.data.tr === null ? null : Math.round(p.data.tr * 100),
    restoTrMoment: p.data.trMoment,
  }).where(eq(users.id, user.id));
  revalidatePath("/profil");
  revalidatePath("/alternance/notes-de-frais");
  return { ok: "Réglages enregistrés" };
}
