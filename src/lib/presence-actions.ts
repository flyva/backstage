"use server";

import { getSessionUser } from "@/lib/auth";
import { markOnline } from "@/lib/presence";

/** Signale que la personne connectée est active (statut « en ligne » dans l'annuaire et les messages). */
export async function pingOnline() {
  const user = await getSessionUser();
  if (user) markOnline(user.id);
}
