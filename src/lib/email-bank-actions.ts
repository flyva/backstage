"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { emailBankEntries } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import type { FormState } from "@/lib/actions";

const refresh = () => revalidatePath("/recherche-entreprises/banque-mails");

/** Ajoute un contact à la banque de mails PARTAGÉE (n'importe qui peut compléter, comme l'annuaire). */
export async function createEmailBankEntry(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const label = String(fd.get("label") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim();
  const category = String(fd.get("category") ?? "").trim();
  const note = String(fd.get("note") ?? "").trim();
  if (!label) return { error: "Le nom est obligatoire" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email invalide" };

  await db.insert(emailBankEntries).values({ label, email, category: category.slice(0, 80), note: note.slice(0, 300), createdByUserId: user.id });
  refresh();
  return { ok: "Contact ajouté à la banque de mails" };
}

/** Supprime un contact de la banque partagée : seulement permis à qui l'a ajouté (ou un administrateur). */
export async function deleteEmailBankEntry(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  if (!id) return;
  const [entry] = await db.select({ createdByUserId: emailBankEntries.createdByUserId }).from(emailBankEntries).where(eq(emailBankEntries.id, id)).limit(1);
  if (!entry) return;
  if (entry.createdByUserId !== user.id && !user.perms.admin) return;
  await db.delete(emailBankEntries).where(eq(emailBankEntries.id, id));
  refresh();
}
