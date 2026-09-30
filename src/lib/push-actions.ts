"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { headers } from "next/headers";
import { db } from "@/db";
import { pushSubscriptions, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { notifyUser } from "@/lib/push";

const subSchema = z.object({
  endpoint: z.string().url().max(600).refine((u) => u.startsWith("https://"), "Point d'accès invalide"),
  keys: z.object({ p256dh: z.string().min(10).max(255), auth: z.string().min(5).max(100) }),
});

export async function saveSubscription(sub: unknown): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const p = subSchema.safeParse(sub);
  if (!p.success) return { ok: false, error: "Abonnement invalide" };
  const ua = ((await headers()).get("user-agent") ?? "").slice(0, 200);
  // Un même appareil ne doit être lié qu'à un seul compte : l'abonnement est réattribué à l'utilisateur courant.
  await db
    .insert(pushSubscriptions)
    .values({ userId: user.id, endpoint: p.data.endpoint, p256dh: p.data.keys.p256dh, auth: p.data.keys.auth, userAgent: ua })
    .onDuplicateKeyUpdate({ set: { userId: user.id, p256dh: p.data.keys.p256dh, auth: p.data.keys.auth, userAgent: ua } });
  revalidatePath("/profil");
  return { ok: true };
}

export async function removeSubscription(endpoint: string) {
  const user = await requireUser();
  const [row] = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).limit(1);
  if (row && row.userId === user.id) await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, row.id));
  revalidatePath("/profil");
}

export async function updateNotifyPrefs(prefs: { news: boolean; bde: boolean; loans: boolean; reminders: boolean }) {
  const user = await requireUser();
  await db
    .update(users)
    .set({ notifyNews: !!prefs.news, notifyBde: !!prefs.bde, notifyLoans: !!prefs.loans, notifyReminders: !!prefs.reminders })
    .where(eq(users.id, user.id));
  revalidatePath("/profil");
}

export async function sendTestNotification(): Promise<{ sent: number }> {
  const user = await requireUser();
  const sent = await notifyUser(user.id, {
    title: "Backstage",
    body: "Les notifications fonctionnent sur cet appareil ✓",
    url: "/profil",
    tag: "test",
  });
  return { sent };
}
