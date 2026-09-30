import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { roles } from "@/db/schema";

/** Identifiant d'un rôle d'origine (admin, materiel, bde, member). */
export async function roleIdByKey(key: "admin" | "materiel" | "bde" | "member"): Promise<number | null> {
  const [r] = await db.select({ id: roles.id }).from(roles).where(eq(roles.key, key)).limit(1);
  return r?.id ?? null;
}

/** Rôle donné aux nouveaux comptes : « Membre » ; « Administrateur » pour le tout premier compte. */
export const newUserRoleId = (first: boolean) => roleIdByKey(first ? "admin" : "member");
