"use server";

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { conversations, listings, messageAttachments, messages, reviews, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { hydrateMessages, messageCountsBySender } from "@/lib/messaging";
import { emitEvent, emitMessage, isPresent, setPresent } from "@/lib/message-bus";
import { MAX_MESSAGE_FILES, MAX_MESSAGE_FILE_BYTES, ensureMessageFilesDir, messageFilesDir, newMessageFileName, sniffMessageFile } from "@/lib/message-files";
import { notifyUser } from "@/lib/push";
import { allow } from "@/lib/rate-limit";
import type { FormState } from "@/lib/actions";

const body = (fd: FormData) => String(fd.get("body") ?? "").trim().slice(0, 2000);

// Pas de notification push si la personne a déjà la conversation ouverte sous les yeux (flux en direct connecté et onglet visible).
async function pushNew(toUserId: number, fromName: string, subtitle: string, conversationId: number, text: string) {
  if (isPresent(conversationId, toUserId)) return;
  await notifyUser(toUserId, { title: subtitle ? `${fromName} · ${subtitle}` : fromName, body: text.length > 120 ? `${text.slice(0, 117)}…` : text, url: `/messages/${conversationId}`, tag: `conv-${conversationId}` }, "messages").catch(() => 0);
}

/** Déclaré présent (ou absent) par le fil en direct d'une conversation : voir message-bus.ts. */
export async function setConversationPresence(conversationId: number, present: boolean) {
  const user = await requireUser();
  const [conv] = await db.select({ buyerId: conversations.buyerId, sellerId: conversations.sellerId }).from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!conv || (conv.buyerId !== user.id && conv.sellerId !== user.id)) return;
  setPresent(conversationId, user.id, present);
}

/** Premier message à une personne de l'annuaire, hors annonce : crée la conversation (ou reprend celle qui existe). */
export async function startDirectConversation(otherUserId: number): Promise<{ error: string } | { conversationId: number }> {
  const user = await requireUser();
  if (otherUserId === user.id) return { error: "Tu ne peux pas t'écrire à toi-même" };
  const [other] = await db.select({ id: users.id, status: users.status }).from(users).where(eq(users.id, otherUserId)).limit(1);
  if (!other || other.status !== "active") return { error: "Personne introuvable" };

  const now = new Date();
  const [existing] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(isNull(conversations.listingId), or(and(eq(conversations.buyerId, user.id), eq(conversations.sellerId, otherUserId)), and(eq(conversations.buyerId, otherUserId), eq(conversations.sellerId, user.id)))))
    .limit(1);
  if (existing) return { conversationId: existing.id };

  const [res] = await db.insert(conversations).values({ listingId: null, buyerId: user.id, sellerId: otherUserId, buyerReadAt: now, lastMessageAt: now });
  return { conversationId: res.insertId };
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
  const [ins] = await db.insert(messages).values({ conversationId: conv.id, senderId: user.id, body: text, createdAt: now });
  await db.update(conversations).set({ lastMessageAt: now, buyerReadAt: now }).where(eq(conversations.id, conv.id));
  emitMessage(conv.id, { id: ins.insertId, senderId: user.id, body: text, createdAt: now.toISOString(), replyTo: null, attachments: [] }); // arrive tout de suite chez l'autre personne
  await pushNew(l.userId, user.name, l.title, conv.id, text);
  revalidatePath("/messages");
  redirect(`/messages/${conv.id}`);
}

export async function sendMessage(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const text = body(fd);
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!text && files.length === 0) return { error: "Écris un message ou joins un fichier" };
  if (files.length > MAX_MESSAGE_FILES) return { error: `${MAX_MESSAGE_FILES} fichiers maximum` };
  for (const f of files) {
    if (f.size > MAX_MESSAGE_FILE_BYTES) return { error: `« ${f.name} » dépasse 15 Mo` };
  }
  const id = Number(fd.get("conversationId"));
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  if (!conv || (conv.buyerId !== user.id && conv.sellerId !== user.id)) return { error: "Conversation introuvable" };
  if (!allow(`msg:${user.id}`, 40, 10 * 60e3)) return { error: "Trop de messages : réessaie dans quelques minutes." };

  // Réponse à un message : doit appartenir à la même conversation (sinon ignorée plutôt que de bloquer l'envoi).
  const replyToRaw = Number(fd.get("replyToId"));
  let replyToId: number | null = null;
  if (Number.isInteger(replyToRaw) && replyToRaw > 0) {
    const [target] = await db.select({ id: messages.id }).from(messages).where(and(eq(messages.id, replyToRaw), eq(messages.conversationId, conv.id))).limit(1);
    if (target) replyToId = target.id;
  }

  const now = new Date();
  const mine = conv.buyerId === user.id;
  const [ins] = await db.insert(messages).values({ conversationId: conv.id, senderId: user.id, body: text, replyToId, createdAt: now });

  if (files.length > 0) {
    await ensureMessageFilesDir();
    for (const f of files) {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const kind = sniffMessageFile(bytes);
      if (!kind) continue; // format non reconnu : ignoré plutôt que de bloquer tout le message
      const name = newMessageFileName(kind.ext);
      await writeFile(path.join(messageFilesDir(), name), bytes);
      const original = f.name.replace(/[\u0000-\u001f\\/]/g, "_").slice(0, 200) || `fichier.${kind.ext}`;
      await db.insert(messageAttachments).values({ messageId: ins.insertId, file: name, originalName: original, mime: kind.mime, size: bytes.length });
    }
  }

  await db.update(conversations).set({ lastMessageAt: now, ...(mine ? { buyerReadAt: now } : { sellerReadAt: now }) }).where(eq(conversations.id, conv.id));
  const [[live]] = await Promise.all([
    hydrateMessages(conv.id, [{ id: ins.insertId, senderId: user.id, body: text, replyToId, createdAt: now }]),
  ]);
  emitMessage(conv.id, live);
  const [l] = conv.listingId ? await db.select({ title: listings.title }).from(listings).where(eq(listings.id, conv.listingId)).limit(1) : [];
  await pushNew(mine ? conv.sellerId : conv.buyerId, user.name, l?.title ?? "", conv.id, text || "📎 Pièce jointe");
  revalidatePath(`/messages/${conv.id}`);
  revalidatePath("/messages");
  return { ok: "Envoyé" };
}

/** Marque la conversation comme lue (appelé quand un message arrive pendant qu'elle est ouverte). */
export async function markConversationRead(conversationId: number) {
  const user = await requireUser();
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!conv || (conv.buyerId !== user.id && conv.sellerId !== user.id)) return;
  const now = new Date();
  await db.update(conversations).set(conv.buyerId === user.id ? { buyerReadAt: now } : { sellerReadAt: now }).where(eq(conversations.id, conv.id));
  emitEvent(conv.id, { kind: "read", userId: user.id, at: now.toISOString() }); // l'autre personne voit « Vu » tout de suite
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
  if (!conv.listingId) return { error: "Les avis ne sont possibles que pour une conversation d'annonce." };
  const listingId = conv.listingId;
  // Les avis ne suivent qu'une vente réelle : l'annonce doit avoir été conclue avec l'acheteur de cette conversation.
  const [deal] = await db.select({ status: listings.status, soldToId: listings.soldToId }).from(listings).where(eq(listings.id, listingId)).limit(1);
  if (!deal || deal.status !== "closed" || deal.soldToId !== conv.buyerId) return { error: "Les avis sont possibles une fois l'annonce conclue avec l'acheteur." };
  const counts = await messageCountsBySender(conv.id);
  if ((counts.get(conv.buyerId) ?? 0) < 1 || (counts.get(conv.sellerId) ?? 0) < 1) return { error: "Vous devez chacun avoir écrit au moins un message avant de laisser un avis." };
  if (!allow(`review:${user.id}`, 20, 24 * 3600e3)) return { error: "Trop d'avis aujourd'hui : réessaie demain." };

  const iAmBuyer = conv.buyerId === user.id;
  const subjectId = iAmBuyer ? conv.sellerId : conv.buyerId;
  const [l] = await db.select({ title: listings.title }).from(listings).where(eq(listings.id, listingId)).limit(1);
  const values = { listingId, listingTitle: l?.title ?? "Annonce", authorId: user.id, subjectId, subjectRole: (iAmBuyer ? "seller" : "buyer") as "seller" | "buyer", rating, comment: comment || null };
  const [existing] = await db.select({ id: reviews.id }).from(reviews).where(and(eq(reviews.authorId, user.id), eq(reviews.listingId, listingId), eq(reviews.subjectId, subjectId))).limit(1);
  if (existing) await db.update(reviews).set({ rating, comment: values.comment }).where(eq(reviews.id, existing.id));
  else await db.insert(reviews).values(values);
  if (!existing) {
    await notifyUser(subjectId, { title: `Nouvel avis de ${user.name}`, body: `${"★".repeat(rating)}${comment ? ` · ${comment.slice(0, 80)}` : ""}`, url: `/messages/${conv.id}`, tag: `review-${conv.id}` }, "messages").catch(() => 0);
  }
  revalidatePath(`/messages/${conv.id}`);
  revalidatePath("/annonces");
  revalidatePath(`/annonces/${listingId}`);
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
