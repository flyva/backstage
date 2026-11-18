"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { bdeFinancialEntries, FINANCE_CATEGORIES, FINANCE_DIRECTIONS } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { isDay } from "@/lib/alternance";
import { fmtEuros } from "@/lib/finance";
import type { FormState } from "@/lib/actions";

const refresh = () => revalidatePath("/admin/finances");

const entrySchema = z.object({
  direction: z.enum(FINANCE_DIRECTIONS),
  category: z.enum(FINANCE_CATEGORIES),
  label: z.string().trim().min(1, "Libellé requis").max(200),
  amount: z.coerce.number().positive("Montant : doit être supérieur à 0"),
  occurredOn: z.string().refine(isDay, "Date invalide"),
  method: z.string().trim().max(40),
  reference: z.string().trim().max(120),
  notes: z.string().trim().max(2000),
});

/** Créé ou met à jour une écriture comptable (recette/dépense du BDE). Même formulaire que l'outil Oasis. */
export async function saveFinancialEntry(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const p = entrySchema.safeParse({
    direction: fd.get("direction"),
    category: fd.get("category"),
    label: fd.get("label"),
    amount: fd.get("amount"),
    occurredOn: fd.get("occurredOn"),
    method: fd.get("method") ?? "",
    reference: fd.get("reference") ?? "",
    notes: fd.get("notes") ?? "",
  });
  if (!p.success) return { error: p.error.issues[0].message };

  const values = {
    direction: p.data.direction,
    category: p.data.category,
    label: p.data.label,
    amountCents: Math.round(p.data.amount * 100),
    occurredOn: p.data.occurredOn,
    method: p.data.method || null,
    reference: p.data.reference || null,
    notes: p.data.notes || null,
  };

  const raw = Number(fd.get("id") || 0);
  const detail = `${p.data.label} (${fmtEuros(values.amountCents)})`;
  if (raw) {
    await db.update(bdeFinancialEntries).set(values).where(eq(bdeFinancialEntries.id, raw));
    await logAdminAction(admin.id, "finance-update", null, detail);
  } else {
    await db.insert(bdeFinancialEntries).values({ ...values, createdBy: admin.id });
    await logAdminAction(admin.id, "finance-create", null, detail);
  }
  refresh();
  redirect("/admin/finances");
}

export async function deleteFinancialEntry(fd: FormData) {
  const admin = await requireAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  const [entry] = await db.select({ label: bdeFinancialEntries.label }).from(bdeFinancialEntries).where(eq(bdeFinancialEntries.id, id)).limit(1);
  await db.delete(bdeFinancialEntries).where(eq(bdeFinancialEntries.id, id));
  if (entry) await logAdminAction(admin.id, "finance-delete", null, entry.label);
  refresh();
}
