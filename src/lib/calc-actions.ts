"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { calcSupplyLists } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export type SupplyKind = "mono" | "tetra";
export type SupplyItem = { name: string; watts: string; qty: string };

const MAX_ITEMS = 60;
const clip = (s: unknown, n: number) => String(s ?? "").slice(0, n);

/** La liste de matériel de la personne (bilan de puissance), ou une liste vide si elle n'a encore rien enregistré. */
export async function loadSupplyList(userId: number): Promise<{ kind: SupplyKind; items: SupplyItem[] }> {
  const [row] = await db.select().from(calcSupplyLists).where(eq(calcSupplyLists.userId, userId)).limit(1);
  if (!row) return { kind: "tetra", items: [] };
  let items: SupplyItem[] = [];
  try {
    const parsed = JSON.parse(row.items) as unknown;
    if (Array.isArray(parsed)) {
      items = parsed.slice(0, MAX_ITEMS).map((it) => ({ name: clip((it as SupplyItem)?.name, 120), watts: clip((it as SupplyItem)?.watts, 12), qty: clip((it as SupplyItem)?.qty, 12) }));
    }
  } catch { /* liste illisible : on repart de zéro plutôt que de planter la page */ }
  return { kind: row.kind, items };
}

/** Enregistre la liste de matériel de la personne (bilan de puissance) : propre à son compte, jamais partagée. */
export async function saveSupplyList(kind: SupplyKind, items: SupplyItem[]) {
  const user = await requireUser();
  const clean: SupplyItem[] = (Array.isArray(items) ? items : []).slice(0, MAX_ITEMS).map((it) => ({
    name: clip(it?.name, 120), watts: clip(it?.watts, 12), qty: clip(it?.qty, 12),
  }));
  const safeKind: SupplyKind = kind === "mono" ? "mono" : "tetra";
  await db
    .insert(calcSupplyLists)
    .values({ userId: user.id, kind: safeKind, items: JSON.stringify(clean) })
    .onDuplicateKeyUpdate({ set: { kind: safeKind, items: JSON.stringify(clean), updatedAt: new Date() } });
}
