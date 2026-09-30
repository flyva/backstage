"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { POLL_ANSWERS, pollInvites, pollOptions, pollVotes, polls, users, type PollAnswer } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { parseParisInput } from "@/lib/paris";
import { notifyUser } from "@/lib/push";
import { allow } from "@/lib/rate-limit";
import { slotLabel } from "@/lib/poll-shared";
import type { FormState } from "@/lib/actions";

const MAX_OPTIONS = 20;
const MAX_INVITES = 200;
const text = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);

async function validInvitees(ids: string[], exclude: number): Promise<number[]> {
  const wanted = [...new Set(ids.map(Number).filter((n) => Number.isInteger(n) && n > 0 && n !== exclude))].slice(0, MAX_INVITES);
  if (wanted.length === 0) return [];
  const rows = await db.select({ id: users.id }).from(users).where(and(inArray(users.id, wanted), eq(users.status, "active")));
  return rows.map((r) => r.id);
}

async function notifyInvitees(pollId: number, title: string, from: string, ids: number[]) {
  await Promise.all(ids.map((id) => notifyUser(id, { title: `Sondage : ${title}`, body: `${from} te demande tes disponibilités.`, url: `/disponibilites/${pollId}`, tag: `poll-${pollId}` }).catch(() => 0)));
}

export async function createPoll(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const title = text(fd, "title", 150);
  if (!title) return { error: "Donne un titre au sondage" };
  const starts = fd.getAll("optStart").map(String);
  const ends = fd.getAll("optEnd").map(String);
  const options: { startsAt: Date; endsAt: Date | null }[] = [];
  for (let i = 0; i < starts.length; i++) {
    if (!starts[i]) continue;
    const startsAt = parseParisInput(starts[i]);
    if (!startsAt) return { error: "Un des créneaux a une date invalide" };
    const endsAt = ends[i] ? parseParisInput(ends[i]) : null;
    if (ends[i] && (!endsAt || endsAt <= startsAt)) return { error: "La fin d'un créneau doit être après son début" };
    options.push({ startsAt, endsAt });
  }
  if (options.length === 0) return { error: "Ajoute au moins un créneau" };
  if (options.length > MAX_OPTIONS) return { error: `${MAX_OPTIONS} créneaux maximum` };
  if (!allow(`poll:${user.id}`, 10, 24 * 3600e3)) return { error: "10 sondages par jour maximum : réessaie demain." };

  const invitees = await validInvitees(fd.getAll("invite").map(String), user.id);
  const [res] = await db.insert(polls).values({ creatorId: user.id, title, description: text(fd, "description", 500) || null });
  const pollId = res.insertId;
  await db.insert(pollOptions).values(options.map((o) => ({ pollId, ...o })));
  if (invitees.length) await db.insert(pollInvites).values(invitees.map((userId) => ({ pollId, userId })));
  await notifyInvitees(pollId, title, user.name, invitees);
  revalidatePath("/disponibilites");
  redirect(`/disponibilites/${pollId}`);
}

export async function savePollVotes(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const pollId = Number(fd.get("pollId"));
  const [poll] = await db.select().from(polls).where(eq(polls.id, pollId)).limit(1);
  if (!poll) return { error: "Sondage introuvable" };
  if (poll.closed) return { error: "Ce sondage est clos" };
  const opts = await db.select({ id: pollOptions.id }).from(pollOptions).where(eq(pollOptions.pollId, pollId));
  const rows: { optionId: number; userId: number; answer: PollAnswer }[] = [];
  for (const o of opts) {
    const a = String(fd.get(`a_${o.id}`) ?? "");
    if ((POLL_ANSWERS as readonly string[]).includes(a)) rows.push({ optionId: o.id, userId: user.id, answer: a as PollAnswer });
  }
  const ids = opts.map((o) => o.id);
  if (ids.length) await db.delete(pollVotes).where(and(eq(pollVotes.userId, user.id), inArray(pollVotes.optionId, ids)));
  if (rows.length) await db.insert(pollVotes).values(rows);
  revalidatePath(`/disponibilites/${pollId}`);
  revalidatePath("/disponibilites");
  return { ok: "Tes disponibilités sont enregistrées" };
}

async function ownPoll(id: number) {
  const user = await requireUser();
  const [p] = await db.select().from(polls).where(eq(polls.id, id)).limit(1);
  if (!p || (p.creatorId !== user.id && !user.perms.administration)) return null;
  return { p, user };
}

/** Clôture le sondage, avec le créneau retenu (facultatif) : les personnes qui ont répondu ou ont été invitées sont prévenues. */
export async function closePoll(fd: FormData) {
  const own = await ownPoll(Number(fd.get("pollId")));
  if (!own) return;
  const { p } = own;
  const optId = Number(fd.get("finalOptionId"));
  const [final] = Number.isInteger(optId) && optId > 0 ? await db.select().from(pollOptions).where(and(eq(pollOptions.id, optId), eq(pollOptions.pollId, p.id))).limit(1) : [];
  await db.update(polls).set({ closed: true, finalOptionId: final?.id ?? null }).where(eq(polls.id, p.id));
  if (final) {
    const [inv, voters] = await Promise.all([
      db.select({ id: pollInvites.userId }).from(pollInvites).where(eq(pollInvites.pollId, p.id)),
      db.selectDistinct({ id: pollVotes.userId }).from(pollVotes).innerJoin(pollOptions, eq(pollOptions.id, pollVotes.optionId)).where(eq(pollOptions.pollId, p.id)),
    ]);
    const ids = [...new Set([...inv, ...voters].map((r) => r.id))].filter((id) => id !== own.user.id);
    await Promise.all(ids.map((id) => notifyUser(id, { title: `Sondage : ${p.title}`, body: `Créneau retenu : ${slotLabel(final.startsAt, final.endsAt)}`, url: `/disponibilites/${p.id}`, tag: `poll-${p.id}` }).catch(() => 0)));
  }
  revalidatePath(`/disponibilites/${p.id}`);
  revalidatePath("/disponibilites");
}

export async function reopenPoll(fd: FormData) {
  const own = await ownPoll(Number(fd.get("pollId")));
  if (!own) return;
  await db.update(polls).set({ closed: false, finalOptionId: null }).where(eq(polls.id, own.p.id));
  revalidatePath(`/disponibilites/${own.p.id}`);
  revalidatePath("/disponibilites");
}

export async function deletePoll(fd: FormData) {
  const own = await ownPoll(Number(fd.get("pollId")));
  if (!own) return;
  await db.delete(polls).where(eq(polls.id, own.p.id));
  revalidatePath("/disponibilites");
  redirect("/disponibilites");
}

/** Invite d'autres personnes après coup (elles reçoivent la notification). */
export async function addPollInvites(fd: FormData) {
  const own = await ownPoll(Number(fd.get("pollId")));
  if (!own) return;
  const existing = new Set((await db.select({ id: pollInvites.userId }).from(pollInvites).where(eq(pollInvites.pollId, own.p.id))).map((r) => r.id));
  const fresh = (await validInvitees(fd.getAll("invite").map(String), own.user.id)).filter((id) => !existing.has(id));
  if (fresh.length) {
    await db.insert(pollInvites).values(fresh.map((userId) => ({ pollId: own.p.id, userId })));
    await notifyInvitees(own.p.id, own.p.title, own.user.name, fresh);
  }
  revalidatePath(`/disponibilites/${own.p.id}`);
}
