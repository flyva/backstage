"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { conversations, listings, messages, reviews } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { messageCountsBySender } from "@/lib/messaging";
import { notifyUser } from "@/lib/push";
import { allow } from "@/lib/rate-limit";
import type { FormState } from "@/lib/actions";

const body = (fd: FormData) => String(fd.get("body") ?? "").trim().slice(0, 2000);

async function pushNew(toUserId: number, fromName: string, listingTitle: string, conversationId: number, text: string) {
  await notifyUser(toUserId, { title: `${fromName} · ${listingTitle}`, body: text.length > 120 ? `${text.slice(0, 117)}…` : text, url: `/messages/${conversationId}`, tag: `conv-${conversationId}` }).catch(() => 0);
}

/** Premier message d'une personne intéressée par une annonce : crée la conversation (ou reprend celle qui existe). */
export async function startConversation(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const text = body(fd);
  if (!text) return { error: "Écris ton message" };
  const listingId = Number(fd.get("listingId"));
  const [l] = await db.select().from(listings).where(and(eq(listings.id, listingId), gt(listings.expiresAt, new Date()))).limit(1);
  if (!l) return { error: "Cette annonce n'existe plus" };
  if (l.userId === user.id) return { error: "C'est ton annonce : tu ne peux pas t'écrire à toi-même" };
  if (!allow(`msg:${user.id}`, 40, 10 * 60e3)) return { error: "Trop de messages : réessaie dans quelques minutes." };

  const now = new Date();
  let [conv] = await db.select().from(conversations).where(and(eq(conversations.listingId, l.id), eq(conversations.buyerId, user.id))).limit(1);
  if (!conv) {
    const [res] = await db.insert(conversations).values({ listingId: l.id, buyerId: user.id, sellerId: l.userId, buyerReadAt: now, lastMessageAt: now });
    [conv] = await db.select().from(conversations).where(eq(conversations.id, res.insertId)).limit(1);
  }
  await db.insert(messages).values({ conversationId: conv.id, senderId: user.id, body: text, createdAt: now });
  await db.update(conversations).set({ lastMessageAt: now, buyerReadAt: now }).where(eq(conversations.id, conv.id));
  await pushNew(l.userId, user.name, l.title, conv.id, text);
  revalidatePath("/messages");
  redirect(`/messages/${conv.id}`);
}

export async function sendMessage(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const text = body(fd);
  if (!text) return { error: "Écris ton message" };
  const id = Number(fd.get("conversationId"));
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  if (!conv || (conv.buyerId !== user.id && conv.sellerId !== user.id)) return { error: "Conversation introuvable" };
  if (!allow(`msg:${user.id}`, 40, 10 * 60e3)) return { error: "Trop de messages : réessaie dans quelques minutes." };

  const now = new Date();
  const mine = conv.buyerId === user.id;
  await db.insert(messages).values({ conversationId: conv.id, senderId: user.id, body: text, createdAt: now });
  await db.update(conversations).set({ lastMessageAt: now, ...(mine ? { buyerReadAt: now } : { sellerReadAt: now }) }).where(eq(conversations.id, conv.id));
  const [l] = await db.select({ title: listings.title }).from(listings).where(eq(listings.id, conv.listingId)).limit(1);
  await pushNew(mine ? conv.sellerId : conv.buyerId, user.name, l?.title ?? "Annonce", conv.id, text);
  revalidatePath(`/messages/${conv.id}`);
  revalidatePath("/messages");
  return { ok: "Envoyé" };
}

/** Avis sur l'autre personne de la conversation : il faut que chacune ait écrit au moins une fois. */
export async function saveReview(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = Number(fd.get("conversationId"));
  const rating = Number(fd.get("rating"));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Choisis une note de 1 à 5" };
  const comment = String(fd.get("comment") ?? "").trim().slice(0, 500);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  if (!conv || (conv.buyerId !== user.id && conv.sellerId !== user.id)) return { error: "Conversation introuvable" };
  const counts = await messageCountsBySender(conv.id);
  if ((counts.get(conv.buyerId) ?? 0) < 1 || (counts.get(conv.sellerId) ?? 0) < 1) return { error: "Vous devez chacun avoir écrit au moins un message avant de laisser un avis." };
  if (!allow(`review:${user.id}`, 20, 24 * 3600e3)) return { error: "Trop d'avis aujourd'hui : réessaie demain." };

  const iAmBuyer = conv.buyerId === user.id;
  const subjectId = iAmBuyer ? conv.sellerId : conv.buyerId;
  const [l] = await db.select({ title: listings.title }).from(listings).where(eq(listings.id, conv.listingId)).limit(1);
  const values = { listingId: conv.listingId, listingTitle: l?.title ?? "Annonce", authorId: user.id, subjectId, subjectRole: (iAmBuyer ? "seller" : "buyer") as "seller" | "buyer", rating, comment: comment || null };
  const [existing] = await db.select({ id: reviews.id }).from(reviews).where(and(eq(reviews.authorId, user.id), eq(reviews.listingId, conv.listingId), eq(reviews.subjectId, subjectId))).limit(1);
  if (existing) await db.update(reviews).set({ rating, comment: values.comment }).where(eq(reviews.id, existing.id));
  else await db.insert(reviews).values(values);
  revalidatePath(`/messages/${conv.id}`);
  revalidatePath("/annonces");
  revalidatePath(`/annonces/${conv.listingId}`);
  return { ok: existing ? "Avis mis à jour" : "Merci, ton avis est publié" };
}

export async function deleteReview(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  const [r] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
  if (!r || (r.authorId !== user.id && !user.perms.administration)) return;
  await db.delete(reviews).where(eq(reviews.id, id));
  revalidatePath("/messages", "layout");
  revalidatePath("/annonces", "layout");
}
