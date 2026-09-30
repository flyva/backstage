import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { equipmentItems, loans, type LoanStatus } from "@/db/schema";
import { requireUser } from "@/lib/auth";

/** Gère le matériel : les rôles avec le droit « Matériel » (les admins ont tout). */
export const isManager = (u: { perms: { materiel: boolean } }) => u.perms.materiel;

export async function requireManager() {
  const user = await requireUser();
  if (!isManager(user)) redirect("/materiel");
  return user;
}

export const STATUS_LABEL: Record<LoanStatus, string> = {
  requested: "Demandé",
  reserved: "Validé",
  out: "Sorti",
  returned: "Rendu",
  rejected: "Refusé",
  cancelled: "Annulé",
};

/** Date du jour à Paris (AAAA-MM-JJ) : c'est elle qui décide si un prêt est en retard. */
export function todayParis(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 864e5);
}

/** Un prêt « sorti » dont la deadline est passée est en retard. */
export const isOverdue = (l: { status: LoanStatus; dueDate: string }, today = todayParis()) =>
  l.status === "out" && l.dueDate < today;

/**
 * Quantité disponible d'un objet sur la période [start, end].
 * Comptent : les prêts validés et sortis qui chevauchent la période. Un prêt sorti
 * en retard bloque le matériel jusqu'à son retour effectif (donc jusqu'à aujourd'hui au moins).
 */
export async function availableQuantity(itemId: number, start: string, end: string, excludeLoanId?: number) {
  const [item] = await db.select().from(equipmentItems).where(eq(equipmentItems.id, itemId)).limit(1);
  if (!item || item.status !== "active") return { item: item ?? null, available: 0 };
  const today = todayParis();
  const busy = await db
    .select()
    .from(loans)
    .where(and(eq(loans.itemId, itemId), inArray(loans.status, ["reserved", "out"])));
  const used = busy
    .filter((l) => l.id !== excludeLoanId)
    .filter((l) => {
      const effectiveEnd = l.status === "out" && l.dueDate < today ? today : l.dueDate;
      return l.startDate <= end && effectiveEnd >= start;
    })
    .reduce((sum, l) => sum + l.quantity, 0);
  return { item, available: Math.max(0, item.quantity - used) };
}

/** Disponibilité de tous les objets sur une période (une seule requête de prêts). */
export async function availabilityForAll(start: string, end: string) {
  const [items, busy] = await Promise.all([
    db.select().from(equipmentItems),
    db.select().from(loans).where(inArray(loans.status, ["reserved", "out"])),
  ]);
  const today = todayParis();
  const used = new Map<number, number>();
  for (const l of busy) {
    const effectiveEnd = l.status === "out" && l.dueDate < today ? today : l.dueDate;
    if (l.startDate <= end && effectiveEnd >= start) used.set(l.itemId, (used.get(l.itemId) ?? 0) + l.quantity);
  }
  return items.map((item) => ({
    item,
    available: item.status === "active" ? Math.max(0, item.quantity - (used.get(item.id) ?? 0)) : 0,
  }));
}
