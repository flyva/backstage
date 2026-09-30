import "server-only";
import webpush from "web-push";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions, users } from "@/db/schema";

export type PushPayload = { title: string; body: string; url: string; tag?: string };
export type PushCategory = "news" | "bde" | "loans" | "reminders";

const COLUMN = { news: users.notifyNews, bde: users.notifyBde, loans: users.notifyLoans, reminders: users.notifyReminders } as const;

let configured: boolean | null = null;
function configure(): boolean {
  if (configured !== null) return configured;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  configured = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT);
  if (configured) webpush.setVapidDetails(VAPID_SUBJECT!, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
  return configured;
}

export const pushEnabled = () => configure();
export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY ?? "";

type Sub = { id: number; endpoint: string; p256dh: string; auth: string };

async function sendTo(subs: Sub[], payload: PushPayload) {
  const body = JSON.stringify(payload);
  const dead: number[] = [];
  let sent = 0;
  // Par petits lots : le Pi n'a qu'1 Go de RAM et peu de connexions sortantes simultanées.
  for (let i = 0; i < subs.length; i += 10) {
    await Promise.all(
      subs.slice(i, i + 10).map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 86400 });
          sent++;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) dead.push(s.id); // abonnement expiré : on le retire
        }
      }),
    );
  }
  if (dead.length) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, dead));
  return sent;
}

/** Notifie tous les utilisateurs qui ont activé cette catégorie (sauf `excludeUserId`, en général l'auteur). */
export async function notifyCategory(category: PushCategory, payload: PushPayload, excludeUserId?: number) {
  if (!configure()) return 0;
  const conds = [eq(COLUMN[category], true)];
  if (excludeUserId) conds.push(ne(users.id, excludeUserId));
  const subs = await db
    .select({ id: pushSubscriptions.id, endpoint: pushSubscriptions.endpoint, p256dh: pushSubscriptions.p256dh, auth: pushSubscriptions.auth })
    .from(pushSubscriptions)
    .innerJoin(users, eq(users.id, pushSubscriptions.userId))
    .where(and(...conds));
  return sendTo(subs, payload);
}

/** Notifie un utilisateur précis (rappels de prêt, message de test). `category` respecte ses préférences. */
export async function notifyUser(userId: number, payload: PushPayload, category?: PushCategory) {
  if (!configure()) return 0;
  const conds = [eq(pushSubscriptions.userId, userId)];
  if (category) conds.push(eq(COLUMN[category], true));
  const subs = await db
    .select({ id: pushSubscriptions.id, endpoint: pushSubscriptions.endpoint, p256dh: pushSubscriptions.p256dh, auth: pushSubscriptions.auth })
    .from(pushSubscriptions)
    .innerJoin(users, eq(users.id, pushSubscriptions.userId))
    .where(and(...conds));
  return sendTo(subs, payload);
}
