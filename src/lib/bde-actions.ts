"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  bdeEvents, bdeIdeas, bdeIdeaVotes, bdePollOptions, bdePolls, bdePollVotes, bdeRegistrations, IDEA_STATUSES,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { requirePublisher } from "@/lib/news";
import { parseParisInput } from "@/lib/paris";
import type { FormState } from "@/lib/actions";

const id = z.coerce.number().int().positive();
const refresh = () => revalidatePath("/bde", "layout");

// ---------- Évènements ----------

const eventSchema = z.object({
  title: z.string().trim().min(3, "Titre trop court").max(200),
  description: z.string().trim().max(5000),
  startsAt: z.string(),
  location: z.string().trim().max(200),
  capacity: z.string().trim(),
});

function readEvent(fd: FormData) {
  const p = eventSchema.safeParse({
    title: fd.get("title"),
    description: fd.get("description") ?? "",
    startsAt: fd.get("startsAt"),
    location: fd.get("location") ?? "",
    capacity: fd.get("capacity") ?? "",
  });
  if (!p.success) return { error: p.error.issues[0].message } as const;
  const startsAt = parseParisInput(p.data.startsAt);
  if (!startsAt) return { error: "Date et heure invalides" } as const;
  let capacity: number | null = null;
  if (p.data.capacity !== "") {
    capacity = Number(p.data.capacity);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 5000) return { error: "Nombre de places invalide" } as const;
  }
  return {
    value: {
      title: p.data.title,
      description: p.data.description || null,
      startsAt,
      location: p.data.location || null,
      capacity,
    },
  } as const;
}

export async function saveEvent(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requirePublisher();
  const e = readEvent(fd);
  if ("error" in e) return { error: e.error };
  const eventId = Number(fd.get("eventId") || 0);
  if (eventId) await db.update(bdeEvents).set(e.value).where(eq(bdeEvents.id, eventId));
  else await db.insert(bdeEvents).values({ ...e.value, createdBy: user.id });
  refresh();
  return { ok: eventId ? "Évènement mis à jour" : "Évènement créé" };
}

export async function deleteEvent(fd: FormData) {
  await requirePublisher();
  await db.delete(bdeEvents).where(eq(bdeEvents.id, id.parse(fd.get("eventId"))));
  refresh();
}

export async function toggleRegistration(fd: FormData) {
  const user = await requireUser();
  const eventId = id.parse(fd.get("eventId"));
  await db.transaction(async (tx) => {
    const [ev] = await tx.select().from(bdeEvents).where(eq(bdeEvents.id, eventId)).limit(1);
    if (!ev || ev.startsAt < new Date()) return; // évènement passé ou supprimé
    const [mine] = await tx
      .select({ u: bdeRegistrations.userId })
      .from(bdeRegistrations)
      .where(and(eq(bdeRegistrations.eventId, eventId), eq(bdeRegistrations.userId, user.id)))
      .limit(1);
    if (mine) {
      await tx.delete(bdeRegistrations).where(and(eq(bdeRegistrations.eventId, eventId), eq(bdeRegistrations.userId, user.id)));
      return;
    }
    if (ev.capacity !== null) {
      const [{ n }] = await tx.select({ n: count() }).from(bdeRegistrations).where(eq(bdeRegistrations.eventId, eventId));
      if (n >= ev.capacity) return; // complet
    }
    await tx.insert(bdeRegistrations).values({ eventId, userId: user.id });
  });
  refresh();
}

// ---------- Sondages ----------

const pollSchema = z.object({
  question: z.string().trim().min(3, "Question trop courte").max(255),
  options: z.string(),
  closesAt: z.string(),
});

export async function createPoll(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requirePublisher();
  const p = pollSchema.safeParse({ question: fd.get("question"), options: fd.get("options") ?? "", closesAt: fd.get("closesAt") ?? "" });
  if (!p.success) return { error: p.error.issues[0].message };
  const options = [...new Set(p.data.options.split("\n").map((o) => o.trim()).filter(Boolean))];
  if (options.length < 2) return { error: "Il faut au moins 2 options (une par ligne)" };
  if (options.length > 10) return { error: "10 options maximum" };
  if (options.some((o) => o.length > 150)) return { error: "Une option est trop longue (150 caractères max)" };
  const closesAt = p.data.closesAt ? parseParisInput(p.data.closesAt) : null;
  if (p.data.closesAt && !closesAt) return { error: "Date de clôture invalide" };

  await db.transaction(async (tx) => {
    const [res] = await tx.insert(bdePolls).values({ question: p.data.question, closesAt, createdBy: user.id });
    await tx.insert(bdePollOptions).values(options.map((label, position) => ({ pollId: res.insertId, label, position })));
  });
  refresh();
  return { ok: "Sondage créé" };
}

export async function deletePoll(fd: FormData) {
  await requirePublisher();
  await db.delete(bdePolls).where(eq(bdePolls.id, id.parse(fd.get("pollId"))));
  refresh();
}

export async function vote(fd: FormData) {
  const user = await requireUser();
  const optionId = id.parse(fd.get("optionId"));
  // Le sondage est retrouvé depuis l'option : on ne fait pas confiance à un pollId envoyé par le client.
  const [opt] = await db.select().from(bdePollOptions).where(eq(bdePollOptions.id, optionId)).limit(1);
  if (!opt) return;
  const [poll] = await db.select().from(bdePolls).where(eq(bdePolls.id, opt.pollId)).limit(1);
  if (!poll || (poll.closesAt && poll.closesAt < new Date())) return;
  await db
    .insert(bdePollVotes)
    .values({ pollId: poll.id, userId: user.id, optionId })
    .onDuplicateKeyUpdate({ set: { optionId } }); // on peut changer son vote tant que le sondage est ouvert
  refresh();
}

// ---------- Boîte à idées ----------

export async function submitIdea(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const body = z.string().trim().min(5, "Ton idée est trop courte").max(1000).safeParse(fd.get("body"));
  if (!body.success) return { error: body.error.issues[0].message };
  await db.insert(bdeIdeas).values({ userId: user.id, body: body.data });
  refresh();
  return { ok: "Merci ! Ton idée a été envoyée (elle apparaît de façon anonyme)." };
}

export async function toggleIdeaVote(fd: FormData) {
  const user = await requireUser();
  const ideaId = id.parse(fd.get("ideaId"));
  const [idea] = await db.select({ id: bdeIdeas.id }).from(bdeIdeas).where(eq(bdeIdeas.id, ideaId)).limit(1);
  if (!idea) return;
  const [mine] = await db.select().from(bdeIdeaVotes).where(and(eq(bdeIdeaVotes.ideaId, ideaId), eq(bdeIdeaVotes.userId, user.id))).limit(1);
  if (mine) await db.delete(bdeIdeaVotes).where(and(eq(bdeIdeaVotes.ideaId, ideaId), eq(bdeIdeaVotes.userId, user.id)));
  else await db.insert(bdeIdeaVotes).values({ ideaId, userId: user.id });
  refresh();
}

export async function setIdeaStatus(fd: FormData) {
  await requirePublisher();
  const status = z.enum(IDEA_STATUSES).safeParse(fd.get("status"));
  if (!status.success) return;
  await db.update(bdeIdeas).set({ status: status.data }).where(eq(bdeIdeas.id, id.parse(fd.get("ideaId"))));
  refresh();
}

export async function deleteIdea(fd: FormData) {
  const user = await requireUser();
  const [idea] = await db.select().from(bdeIdeas).where(eq(bdeIdeas.id, id.parse(fd.get("ideaId")))).limit(1);
  if (!idea) return;
  const isPublisher = user.role === "admin" || user.role === "bde";
  if (idea.userId !== user.id && !isPublisher) return; // l'auteur ou l'équipe BDE
  await db.delete(bdeIdeas).where(eq(bdeIdeas.id, idea.id));
  refresh();
}
