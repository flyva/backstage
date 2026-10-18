"use server";

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { conversationMembers, conversationMutes, conversations, listings, messageAttachments, messages, personalNotes, reviews, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { activeGroupMemberIds, hydrateMessages, isParticipant, messageCountsBySender } from "@/lib/messaging";
import { emitEvent, emitMessage, isPresent, setPresent } from "@/lib/message-bus";
import { MAX_MESSAGE_FILES, MAX_MESSAGE_FILE_BYTES, ensureMessageFilesDir, messageFilesDir, newMessageFileName, removeMessageFile, sniffMessageFile } from "@/lib/message-files";
import { notifyUser } from "@/lib/push";
import { allow } from "@/lib/rate-limit";
import type { FormState } from "@/lib/actions";

const body = (fd: FormData) => String(fd.get("body") ?? "").trim().slice(0, 2000);

// Pas de notification push si la personne a déjà la conversation ouverte sous les yeux (flux en direct connecté et
// onglet visible), ni si elle a mis la conversation en sourdine.
async function pushNew(toUserId: number, fromName: string, subtitle: string, conversationId: number, text: string) {
  if (isPresent(conversationId, toUserId)) return;
  const [muted] = await db.select({ userId: conversationMutes.userId }).from(conversationMutes).where(and(eq(conversationMutes.conversationId, conversationId), eq(conversationMutes.userId, toUserId))).limit(1);
  if (muted) return;
  await notifyUser(toUserId, { title: subtitle ? `${fromName} · ${subtitle}` : fromName, body: text.length > 120 ? `${text.slice(0, 117)}…` : text, url: `/messages/${conversationId}`, tag: `conv-${conversationId}` }, "messages").catch(() => 0);
}

/** Active ou coupe les notifications pour cette conversation (l'historique reste visible normalement). */
export async function toggleMute(fd: FormData) {
  const user = await requireUser();
  const conversationId = Number(fd.get("conversationId"));
  const [conv] = await db.select({ id: conversations.id, kind: conversations.kind, buyerId: conversations.buyerId, sellerId: conversations.sellerId }).from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!conv || !(await isParticipant(conv, user.id))) return;
  const [existing] = await db.select().from(conversationMutes).where(and(eq(conversationMutes.conversationId, conversationId), eq(conversationMutes.userId, user.id))).limit(1);
  if (existing) await db.delete(conversationMutes).where(and(eq(conversationMutes.conversationId, conversationId), eq(conversationMutes.userId, user.id)));
  else await db.insert(conversationMutes).values({ conversationId, userId: user.id });
  revalidatePath(`/messages/${conversationId}`);
}

/** Enregistre (ou efface) la note privée que la personne connectée garde sur quelqu'un d'autre : jamais visible par lui. */
export async function savePersonalNote(aboutUserId: number, note: string) {
  const user = await requireUser();
  if (aboutUserId === user.id) return;
  const text = note.trim().slice(0, 1000);
  if (!text) { await db.delete(personalNotes).where(and(eq(personalNotes.authorId, user.id), eq(personalNotes.aboutUserId, aboutUserId))); return; }
  await db.insert(personalNotes).values({ authorId: user.id, aboutUserId, note: text }).onDuplicateKeyUpdate({ set: { note: text, updatedAt: new Date() } });
}

/** Déclaré présent (ou absent) par le fil en direct d'une conversation : voir message-bus.ts. */
export async function setConversationPresence(conversationId: number, present: boolean) {
  const user = await requireUser();
  const [conv] = await db.select({ id: conversations.id, kind: conversations.kind, buyerId: conversations.buyerId, sellerId: conversations.sellerId }).from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!conv || !(await isParticipant(conv, user.id))) return;
  setPresent(conversationId, user.id, present);
}

/** Crée un groupe avec plusieurs personnes de l'annuaire (2 ou plus, en plus de la créatrice). */
export async function createGroupConversation(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = String(fd.get("name") ?? "").trim().slice(0, 120);
  const memberIds = [...new Set(fd.getAll("memberIds").map((v) => Number(v)).filter((n) => Number.isInteger(n) && n !== user.id))];
  if (memberIds.length < 2) return { error: "Choisis au moins deux personnes" };
  if (!name) return { error: "Donne un nom au groupe" };
  const members = await db.select({ id: users.id, status: users.status }).from(users).where(inArray(users.id, memberIds));
  const valid = members.filter((m) => m.status === "active").map((m) => m.id);
  if (valid.length < 2) return { error: "Certaines personnes choisies sont introuvables" };

  const now = new Date();
  const [res] = await db.insert(conversations).values({ listingId: null, kind: "group", name, buyerId: user.id, sellerId: user.id, buyerReadAt: now, lastMessageAt: now });
  await db.insert(conversationMembers).values([
    { conversationId: res.insertId, userId: user.id, readAt: now },
    ...valid.map((id) => ({ conversationId: res.insertId, userId: id })),
  ]);
  revalidatePath("/messages");
  redirect(`/messages/${res.insertId}`);
}

/** Ajoute des personnes à un groupe existant (n'importe quel membre actif peut inviter). Repêche aussi une personne qui l'avait quitté. */
export async function addGroupMembers(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const conversationId = Number(fd.get("conversationId"));
  const [conv] = await db.select({ id: conversations.id, kind: conversations.kind }).from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!conv || conv.kind !== "group") return { error: "Groupe introuvable" };
  const [member] = await db.select({ userId: conversationMembers.userId }).from(conversationMembers).where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, user.id), isNull(conversationMembers.leftAt))).limit(1);
  if (!member) return { error: "Tu ne fais pas partie de ce groupe" };

  const memberIds = [...new Set(fd.getAll("memberIds").map((v) => Number(v)).filter((n) => Number.isInteger(n) && n !== user.id))];
  if (memberIds.length === 0) return { error: "Choisis au moins une personne" };
  const candidates = await db.select({ id: users.id, status: users.status }).from(users).where(inArray(users.id, memberIds));
  const valid = candidates.filter((c) => c.status === "active").map((c) => c.id);
  if (valid.length === 0) return { error: "Personne introuvable" };

  const existing = await db.select({ userId: conversationMembers.userId }).from(conversationMembers).where(and(eq(conversationMembers.conversationId, conversationId), inArray(conversationMembers.userId, valid)));
  const existingIds = new Set(existing.map((e) => e.userId));
  const toAdd = valid.filter((id) => !existingIds.has(id));
  const toRevive = valid.filter((id) => existingIds.has(id));

  if (toAdd.length) await db.insert(conversationMembers).values(toAdd.map((id) => ({ conversationId, userId: id })));
  if (toRevive.length) await db.update(conversationMembers).set({ leftAt: null }).where(and(eq(conversationMembers.conversationId, conversationId), inArray(conversationMembers.userId, toRevive)));

  revalidatePath(`/messages/${conversationId}`);
  return { ok: "Ajouté·e au groupe" };
}

/** Quitte un groupe : ne reçoit plus les messages, disparaît de sa liste. L'historique reste visible aux autres. */
export async function leaveGroup(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("conversationId"));
  const [conv] = await db.select({ id: conversations.id, kind: conversations.kind }).from(conversations).where(eq(conversations.id, id)).limit(1);
  if (!conv || conv.kind !== "group") return;
  await db.update(conversationMembers).set({ leftAt: new Date() }).where(and(eq(conversationMembers.conversationId, id), eq(conversationMembers.userId, user.id)));
  revalidatePath("/messages");
  redirect("/messages");
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
  if (!conv || !(await isParticipant(conv, user.id))) return { error: "Conversation introuvable" };
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

  if (conv.kind === "group") {
    await db.update(conversations).set({ lastMessageAt: now }).where(eq(conversations.id, conv.id));
    await db.update(conversationMembers).set({ readAt: now }).where(and(eq(conversationMembers.conversationId, conv.id), eq(conversationMembers.userId, user.id)));
  } else {
    await db.update(conversations).set({ lastMessageAt: now, ...(mine ? { buyerReadAt: now } : { sellerReadAt: now }) }).where(eq(conversations.id, conv.id));
  }
  const [[live]] = await Promise.all([
    hydrateMessages(conv.id, [{ id: ins.insertId, senderId: user.id, body: text, replyToId, createdAt: now }]),
  ]);
  emitMessage(conv.id, live);
  if (conv.kind === "group") {
    const recipients = await activeGroupMemberIds(conv.id, user.id);
    await Promise.all(recipients.map((uid) => pushNew(uid, user.name, conv.name ?? "Groupe", conv.id, text || "📎 Pièce jointe")));
  } else {
    const [l] = conv.listingId ? await db.select({ title: listings.title }).from(listings).where(eq(listings.id, conv.listingId)).limit(1) : [];
    await pushNew(mine ? conv.sellerId : conv.buyerId, user.name, l?.title ?? "", conv.id, text || "📎 Pièce jointe");
  }
  revalidatePath(`/messages/${conv.id}`);
  revalidatePath("/messages");
  return { ok: "Envoyé" };
}

/**
 * Supprime une conversation pour de bon (messages, pièces jointes). Pour un groupe, seule la personne qui l'a créé
 * peut le supprimer pour tout le monde ; les autres membres utilisent « Quitter le groupe » (leaveGroup).
 */
export async function deleteConversation(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("conversationId"));
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  if (!conv) return;
  if (conv.kind === "group" ? conv.buyerId !== user.id : !(await isParticipant(conv, user.id))) return;
  const files = await db.select({ file: messageAttachments.file }).from(messageAttachments).innerJoin(messages, eq(messages.id, messageAttachments.messageId)).where(eq(messages.conversationId, id));
  await Promise.all(files.map((f) => removeMessageFile(f.file)));
  await db.delete(conversations).where(eq(conversations.id, id)); // cascade : messages, pièces jointes, membres (groupe) ; avis liés à une annonce restent (indépendants)
  revalidatePath("/messages");
  redirect("/messages");
}

/** Marque la conversation comme lue (appelé quand un message arrive pendant qu'elle est ouverte). */
export async function markConversationRead(conversationId: number) {
  const user = await requireUser();
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!conv || !(await isParticipant(conv, user.id))) return;
  const now = new Date();
  if (conv.kind === "group") {
    await db.update(conversationMembers).set({ readAt: now }).where(and(eq(conversationMembers.conversationId, conv.id), eq(conversationMembers.userId, user.id)));
  } else {
    await db.update(conversations).set(conv.buyerId === user.id ? { buyerReadAt: now } : { sellerReadAt: now }).where(eq(conversations.id, conv.id));
  }
  emitEvent(conv.id, { kind: "read", userId: user.id, at: now.toISOString() }); // l'autre personne voit « Vu » tout de suite (hors groupe)
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
