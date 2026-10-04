import "server-only";
import { after } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { courses, users } from "@/db/schema";
import { fetchIcal, parseEvents, type AgendaEvent } from "@/lib/ical";

// Les cours du lien iCalendar de l'école sont copiés en base : si le lien tombe en panne, le planning reste consultable.
// Un cours modifié est mis à jour, un cours disparu du planning est supprimé (ou marqué « retiré » s'il porte une note).

const SYNC_EVERY = 30 * 60e3; // rafraîchissement normal
const RETRY_AFTER_ERROR = 15 * 60e3; // pas d'acharnement sur un lien en panne
const WINDOW_BEFORE = 90 * 864e5;
const WINDOW_AFTER = 400 * 864e5;

const g = globalThis as unknown as { __courseSync?: Map<number, Promise<SyncResult>> };
const running = (g.__courseSync ??= new Map());

export type SyncResult = { ok: true; count: number } | { ok: false; error: string };

const clip = (s: string, n: number) => s.slice(0, n);

async function doSync(userId: number, url: string): Promise<SyncResult> {
  const now = new Date();
  try {
    const text = await fetchIcal(url, { force: true });
    const from = new Date(now.getTime() - WINDOW_BEFORE);
    const to = new Date(now.getTime() + WINDOW_AFTER);
    const events = parseEvents(text, from, to);
    const seen = new Set<string>();

    const existing = new Map((await db.select().from(courses).where(eq(courses.userId, userId))).map((c) => [c.uid, c]));
    const toInsert: (typeof courses.$inferInsert)[] = [];
    for (const e of events) {
      const uid = clip(e.id, 255);
      if (seen.has(uid)) continue;
      seen.add(uid);
      const row = { title: clip(e.title, 255), location: clip(e.location, 255), description: e.description || null, startsAt: e.start, endsAt: e.end, allDay: e.allDay };
      const old = existing.get(uid);
      if (!old) {
        toInsert.push({ userId, uid, ...row });
      } else if (
        old.removed || old.title !== row.title || old.location !== row.location || (old.description ?? null) !== row.description ||
        old.startsAt.getTime() !== row.startsAt.getTime() || old.endsAt.getTime() !== row.endsAt.getTime() || old.allDay !== row.allDay
      ) {
        await db.update(courses).set({ ...row, removed: false, updatedAt: now }).where(eq(courses.id, old.id));
      }
    }
    for (let i = 0; i < toInsert.length; i += 200) await db.insert(courses).values(toInsert.slice(i, i + 200));

    // Cours à venir qui ne sont plus dans le planning : annulés. Un planning entièrement vide est traité comme suspect (on ne supprime rien).
    if (events.length > 0) {
      for (const old of existing.values()) {
        if (seen.has(old.uid) || old.startsAt <= now || old.startsAt > to || old.removed) continue;
        if (old.note?.trim()) await db.update(courses).set({ removed: true, updatedAt: now }).where(eq(courses.id, old.id));
        else await db.delete(courses).where(eq(courses.id, old.id));
      }
    }
    await db.update(users).set({ icalSyncedAt: now, icalTriedAt: now, icalError: null }).where(eq(users.id, userId));
    return { ok: true, count: seen.size };
  } catch (e) {
    const error = clip(e instanceof Error ? e.message : "erreur inconnue", 200);
    await db.update(users).set({ icalTriedAt: now, icalError: error }).where(eq(users.id, userId)).catch(() => 0);
    return { ok: false, error };
  }
}

/** Synchronise maintenant (une seule synchronisation à la fois par personne). */
export function syncCourses(userId: number, url: string): Promise<SyncResult> {
  const cur = running.get(userId);
  if (cur) return cur;
  const p = doSync(userId, url).finally(() => running.delete(userId));
  running.set(userId, p);
  return p;
}

/**
 * Cours de la période, lus en base. Si la dernière synchronisation est ancienne, elle repart en arrière-plan (la page
 * ne l'attend pas) ; la toute première est attendue pour que la page ne soit pas vide.
 */
export async function courseEvents(user: { id: number; icalUrl: string | null }, from: Date, to: Date): Promise<AgendaEvent[]> {
  if (!user.icalUrl) return [];
  const url = user.icalUrl;
  const [u] = await db.select({ synced: users.icalSyncedAt, tried: users.icalTriedAt, error: users.icalError }).from(users).where(eq(users.id, user.id)).limit(1);
  const interval = u?.error ? RETRY_AFTER_ERROR : SYNC_EVERY;
  const due = !u?.tried || Date.now() - u.tried.getTime() > interval;
  if (due) {
    if (!u?.synced) await syncCourses(user.id, url);
    else {
      try { after(() => { void syncCourses(user.id, url); }); } catch { void syncCourses(user.id, url); }
    }
  }
  const rows = await db.select().from(courses).where(and(eq(courses.userId, user.id), eq(courses.removed, false), lte(courses.startsAt, to), gte(courses.endsAt, from))).orderBy(courses.startsAt);
  return rows.map((c) => ({ id: `c${c.id}`, title: c.title, start: c.startsAt, end: c.endsAt, allDay: c.allDay, location: c.location, description: c.description ?? "" }));
}

export async function courseSyncStatus(userId: number) {
  const [u] = await db.select({ synced: users.icalSyncedAt, error: users.icalError }).from(users).where(eq(users.id, userId)).limit(1);
  return { syncedAt: u?.synced ?? null, error: u?.error ?? null };
}

