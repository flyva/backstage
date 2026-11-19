// Lectures partagées pour la fiche association et l'organigramme BDE.
import { asc, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { bdeOfficerTitles, users } from "@/db/schema";
import { DEFAULT_OFFICER_TITLES } from "@/lib/association";

export async function getOfficerTitles() {
  const rows = await db.select().from(bdeOfficerTitles).orderBy(asc(bdeOfficerTitles.label));
  const labels = new Set(rows.map((r) => r.label));
  return [...DEFAULT_OFFICER_TITLES.filter((l) => !labels.has(l)), ...rows.map((r) => r.label)];
}

export async function getBdeMembers() {
  return db.select({ id: users.id, name: users.name, bdeStatus: users.bdeStatus, bdeTitle: users.bdeTitle })
    .from(users).where(isNotNull(users.bdeStatus)).orderBy(asc(users.name));
}
