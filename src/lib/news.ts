import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

/** Publient les actus : les rôles avec le droit « Actualités de l'école » ou « BDE » (les admins ont tout). */
export const canPublish = (u: { perms: { actus: boolean; bde: boolean } }) => u.perms.actus || u.perms.bde;

export async function requirePublisher() {
  const user = await requireUser();
  if (!canPublish(user)) redirect("/actus");
  return user;
}

export const SCOPE_LABEL = { ecole: "École", bde: "BDE" } as const;
