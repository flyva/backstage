import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

/** Gère l'inventaire : les rôles avec le droit « Inventaire » (les admins ont tout). */
export const isInventoryManager = (u: { perms: { inventaire: boolean } }) => u.perms.inventaire;

export async function requireInventoryManager() {
  const user = await requireUser();
  if (!isInventoryManager(user)) redirect("/inventaire");
  return user;
}

export async function requireInventoryViewer() {
  const user = await requireUser();
  if (!user.perms.view.inventaire) redirect("/");
  return user;
}

/** Seuil d'alerte DLC, en jours avant péremption (voir aussi « tous les jours après » une fois dépassé). */
export const DLC_WARNING_DAYS = [7, 3, 0] as const;
