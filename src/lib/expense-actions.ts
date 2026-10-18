"use server";

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { expenseNotes } from "@/db/schema";
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
  const placeName = String(fd.get("placeName") ?? "").trim();
  const place = String(fd.get("place") ?? "").trim();
  const extraComment = String(fd.get("comment") ?? "").trim().slice(0, 500);
  const euros = Number(String(fd.get("price") ?? "").replace(",", "."));
  const photo = fd.get("photo");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Date invalide" };
  if (!/^\d{2}:\d{2}$/.test(time)) return { error: "Heure invalide" };
  if (!placeName) return { error: "Indique le nom du lieu" };
  if (!Number.isFinite(euros) || euros <= 0 || euros > 100000) return { error: "Prix invalide" };
  if (!(photo instanceof File) || photo.size === 0) return { error: "Ajoute une photo du reçu" };
  if (photo.size > MAX_EXPENSE_PHOTO_BYTES) return { error: "Photo trop lourde (15 Mo max)" };
  if (!allow(`expense:${user.id}`, 30, 60 * 60e3)) return { error: "Trop de notes de frais : réessaie plus tard." };

  const bytes = new Uint8Array(await photo.arrayBuffer());
  const kind = sniffExpensePhoto(bytes);
  if (!kind) return { error: "La photo doit être au format JPG ou PNG" };
  await ensureExpenseFilesDir();
  const name = newExpenseFileName(kind.ext);
  await writeFile(path.join(expenseFilesDir(), name), bytes);

  const priceCents = Math.round(euros * 100);
  const comment = buildExpenseComment(user.name, date, time, placeName, place, priceCents, extraComment);
  const [res] = await db.insert(expenseNotes).values({ userId: user.id, photoFile: name, date, time, placeName, place, priceCents, comment });

  revalidatePath("/alternance/notes-de-frais");
  redirect(`/alternance/notes-de-frais/${res.insertId}`);
}

export async function deleteExpenseNote(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  const [row] = await db.select({ userId: expenseNotes.userId, photoFile: expenseNotes.photoFile }).from(expenseNotes).where(eq(expenseNotes.id, id)).limit(1);
  if (!row || row.userId !== user.id) return;
  await removeExpensePhoto(row.photoFile);
  await db.delete(expenseNotes).where(eq(expenseNotes.id, id));
  revalidatePath("/alternance/notes-de-frais");
  redirect("/alternance/notes-de-frais");
}
