"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, count } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { equipmentItems, loans } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { availableQuantity, daysBetween, requireManager, todayParis } from "@/lib/equipment";
import type { FormState } from "@/lib/actions";

const id = z.coerce.number().int().positive();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide");
const touch = () => {
  revalidatePath("/materiel", "layout");
  revalidatePath("/");
};

// ---------- Inventaire (référents) ----------

const itemSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(150),
  category: z.string().trim().min(1).max(80),
  code: z.string().trim().max(40),
  location: z.string().trim().max(120),
  description: z.string().trim().max(2000),
  quantity: z.coerce.number().int().min(1, "Quantité minimale : 1").max(999),
  status: z.enum(["active", "maintenance", "retired"]),
});

function readItem(fd: FormData) {
  return itemSchema.safeParse({
    name: fd.get("name"),
    category: fd.get("category") || "Divers",
    code: fd.get("code") ?? "",
    location: fd.get("location") ?? "",
    description: fd.get("description") ?? "",
    quantity: fd.get("quantity") || 1,
    status: fd.get("status") || "active",
  });
}

export async function addItem(_: FormState, fd: FormData): Promise<FormState> {
  await requireManager();
  const p = readItem(fd);
  if (!p.success) return { error: p.error.issues[0].message };
  const d = p.data;
  await db.insert(equipmentItems).values({
    ...d,
    code: d.code || null,
    location: d.location || null,
    description: d.description || null,
  });
  touch();
  return { ok: "Matériel ajouté" };
}

export async function updateItem(_: FormState, fd: FormData): Promise<FormState> {
  await requireManager();
  const iid = id.parse(fd.get("itemId"));
  const p = readItem(fd);
  if (!p.success) return { error: p.error.issues[0].message };
  const d = p.data;
  await db.update(equipmentItems).set({
    ...d,
    code: d.code || null,
    location: d.location || null,
    description: d.description || null,
  }).where(eq(equipmentItems.id, iid));
  touch();
  return { ok: "Matériel mis à jour" };
}

export async function deleteItem(fd: FormData) {
  await requireManager();
  const iid = id.parse(fd.get("itemId"));
  const [{ n }] = await db.select({ n: count() }).from(loans).where(eq(loans.itemId, iid));
  // Un objet déjà prêté garde son historique : on le retire du catalogue au lieu de le supprimer.
  if (n > 0) await db.update(equipmentItems).set({ status: "retired" }).where(eq(equipmentItems.id, iid));
  else await db.delete(equipmentItems).where(eq(equipmentItems.id, iid));
  touch();
  redirect("/materiel/gestion");
}

// ---------- Demande de prêt (élève) ----------

const requestSchema = z.object({
  quantity: z.coerce.number().int().min(1, "Quantité minimale : 1").max(999),
  startDate: isoDate,
  dueDate: isoDate,
  note: z.string().trim().max(500),
});

export async function requestLoan(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const iid = id.parse(fd.get("itemId"));
  const p = requestSchema.safeParse({
    quantity: fd.get("quantity") || 1,
    startDate: fd.get("startDate"),
    dueDate: fd.get("dueDate"),
    note: fd.get("note") ?? "",
  });
  if (!p.success) return { error: p.error.issues[0].message };
  const { quantity, startDate, dueDate, note } = p.data;

  const today = todayParis();
  if (startDate < today) return { error: "La date de début ne peut pas être dans le passé" };
  if (dueDate < startDate) return { error: "Le retour doit être après le début du prêt" };
  if (daysBetween(startDate, dueDate) > 30) return { error: "Un prêt ne peut pas dépasser 30 jours" };

  const { item, available } = await availableQuantity(iid, startDate, dueDate);
  if (!item || item.status !== "active") return { error: "Ce matériel n'est pas empruntable actuellement" };
  if (quantity > available) {
    return { error: available === 0 ? "Plus aucun exemplaire disponible sur cette période" : `Seulement ${available} exemplaire(s) disponible(s) sur cette période` };
  }

  await db.insert(loans).values({ itemId: iid, userId: user.id, quantity, startDate, dueDate, note: note || null });
  touch();
  return { ok: "Demande envoyée : un référent matériel va la valider." };
}

export async function cancelLoan(fd: FormData) {
  const user = await requireUser();
  const lid = id.parse(fd.get("loanId"));
  const [loan] = await db.select().from(loans).where(eq(loans.id, lid)).limit(1);
  // On ne peut annuler que ses propres demandes/réservations, pas un prêt déjà sorti.
  if (!loan || loan.userId !== user.id || !["requested", "reserved"].includes(loan.status)) return;
  await db.update(loans).set({ status: "cancelled" }).where(eq(loans.id, lid));
  touch();
}

// ---------- Traitement (référents) ----------

async function loadLoan(fd: FormData) {
  const lid = id.parse(fd.get("loanId"));
  const [loan] = await db.select().from(loans).where(eq(loans.id, lid)).limit(1);
  return loan ?? null;
}

const cond = (fd: FormData) => String(fd.get("condition") ?? "").trim().slice(0, 500) || null;

export async function decideLoan(fd: FormData) {
  await requireManager();
  const loan = await loadLoan(fd);
  if (!loan || loan.status !== "requested") return;
  if (fd.get("decision") === "reject") {
    await db.update(loans).set({ status: "rejected" }).where(eq(loans.id, loan.id));
  } else {
    const { available } = await availableQuantity(loan.itemId, loan.startDate, loan.dueDate, loan.id);
    if (loan.quantity > available) return; // plus assez de stock : la demande reste en attente
    await db.update(loans).set({ status: "reserved" }).where(eq(loans.id, loan.id));
  }
  touch();
}

export async function markOut(fd: FormData) {
  await requireManager();
  const loan = await loadLoan(fd);
  if (!loan || !["requested", "reserved"].includes(loan.status)) return;
  const { available } = await availableQuantity(loan.itemId, loan.startDate, loan.dueDate, loan.id);
  if (loan.quantity > available) return;
  await db.update(loans).set({ status: "out", outAt: new Date(), conditionOut: cond(fd) }).where(eq(loans.id, loan.id));
  touch();
}

export async function markReturned(fd: FormData) {
  await requireManager();
  const loan = await loadLoan(fd);
  if (!loan || loan.status !== "out") return;
  await db.update(loans).set({ status: "returned", returnedAt: new Date(), conditionIn: cond(fd) }).where(and(eq(loans.id, loan.id), eq(loans.status, "out")));
  touch();
}
