"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { ridePassengers, rides } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { parseParisInput } from "@/lib/paris";
import type { FormState } from "@/lib/actions";

const id = z.coerce.number().int().positive();
const refresh = () => revalidatePath("/covoiturage");

const rideSchema = z.object({
  title: z.string().trim().min(2, "Dis pour quoi (évènement, cours, sortie…)").max(150),
  fromPlace: z.string().trim().min(2, "Lieu de départ requis").max(200),
  toPlace: z.string().trim().min(2, "Lieu d'arrivée requis").max(200),
  seats: z.coerce.number().int().min(1, "Au moins 1 place").max(8, "8 places maximum"),
  notes: z.string().trim().max(300),
});

export async function saveRide(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const p = rideSchema.safeParse({ title: fd.get("title"), fromPlace: fd.get("fromPlace"), toPlace: fd.get("toPlace"), seats: fd.get("seats"), notes: fd.get("notes") ?? "" });
  if (!p.success) return { error: p.error.issues[0].message };
  const departsAt = parseParisInput(String(fd.get("departsAt") ?? ""));
  if (!departsAt) return { error: "Date et heure de départ invalides" };
  if (departsAt.getTime() < Date.now() - 3600_000) return { error: "Le départ est dans le passé" };
  const values = { ...p.data, notes: p.data.notes || null, departsAt };

  const raw = Number(fd.get("id") || 0);
  if (raw) {
    const [ride] = await db.select().from(rides).where(eq(rides.id, raw)).limit(1);
    if (!ride || ride.driverId !== user.id) return { error: "Modification non autorisée" };
    const taken = (await db.select({ u: ridePassengers.userId }).from(ridePassengers).where(eq(ridePassengers.rideId, raw))).length;
    if (values.seats < taken) return { error: `${taken} personne(s) sont déjà inscrites : garde au moins ${taken} place(s)` };
    await db.update(rides).set(values).where(eq(rides.id, raw));
  } else {
    await db.insert(rides).values({ ...values, driverId: user.id });
  }
  refresh();
  return { ok: raw ? "Trajet enregistré" : "Trajet proposé" };
}

export async function deleteRide(fd: FormData) {
  const user = await requireUser();
  const rideId = id.parse(fd.get("id"));
  await db.delete(rides).where(and(eq(rides.id, rideId), eq(rides.driverId, user.id)));
  refresh();
}

/** Réserve une place. La vérification des places restantes et l'ajout se font dans une transaction verrouillée. */
export async function joinRide(fd: FormData) {
  const user = await requireUser();
  const rideId = id.parse(fd.get("id"));
  await db.transaction(async (tx) => {
    const [ride] = await tx.select().from(rides).where(eq(rides.id, rideId)).for("update").limit(1);
    if (!ride || ride.driverId === user.id || ride.departsAt.getTime() < Date.now()) return;
    const pax = await tx.select({ u: ridePassengers.userId }).from(ridePassengers).where(eq(ridePassengers.rideId, rideId));
    if (pax.length >= ride.seats || pax.some((p) => p.u === user.id)) return;
    await tx.insert(ridePassengers).values({ rideId, userId: user.id });
  });
  refresh();
}

export async function leaveRide(fd: FormData) {
  const user = await requireUser();
  await db.delete(ridePassengers).where(and(eq(ridePassengers.rideId, id.parse(fd.get("id"))), eq(ridePassengers.userId, user.id)));
  refresh();
}
