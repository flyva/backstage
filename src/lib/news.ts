import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@/db/schema";
import { requireUser } from "@/lib/auth";

/** Publient les actus : les admins et l'équipe BDE. */
export const canPublish = (u: Pick<User, "role">) => u.role === "admin" || u.role === "bde";

export async function requirePublisher() {
  const user = await requireUser();
  if (!canPublish(user)) redirect("/actus");
  return user;
}

export const SCOPE_LABEL = { ecole: "École", bde: "BDE" } as const;
