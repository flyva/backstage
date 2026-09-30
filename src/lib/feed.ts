import "server-only";
import { and, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { bdeEvents, bdeRegistrations, equipmentItems, kanbanCardAssignees, kanbanCards, loans, users, workDays } from "@/db/schema";
import { KIND_LABEL } from "@/lib/alternance";

// Abonnement calendrier personnel (iCalendar) : l'adresse contient un jeton secret, sans mot de passe ni compte.

export const FEED_FILE = /^[a-f0-9]{32}\.ics$/;

/** Échappement des textes iCalendar (RFC 5545). */
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/[,;]/g, (c) => `\\${c}`);

/** Lignes de 75 octets maximum : les suites commencent par une espace. */
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (enc.encode(cur + ch).length > (out.length === 0 ? 75 : 74)) { out.push(cur); cur = ch; } else cur += ch;
  }
  out.push(cur);
  return out.map((l, i) => (i === 0 ? l : ` ${l}`)).join("\r\n");
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const dateOnly = (iso: string) => iso.replace(/-/g, "");
const nextDay = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

type Ev = { uid: string; summary: string; description?: string; location?: string } & (
  | { day: string } // toute la journée
  | { start: Date; end: Date }
);

export async function userByFeedToken(file: string) {
  if (!FEED_FILE.test(file)) return null;
  const [u] = await db.select().from(users).where(and(eq(users.feedToken, file.slice(0, 32)), eq(users.status, "active"))).limit(1);
  return u ?? null;
}

export async function buildFeed(user: { id: number; name: string }): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const since = addDays(today, -30);
  const events: Ev[] = [];

  // Planning de l'alternance : école, entreprise, congé, férié.
  for (const w of await db.select().from(workDays).where(and(eq(workDays.userId, user.id), gte(workDays.day, since)))) {
    events.push({ uid: `wd-${user.id}-${w.day}`, summary: KIND_LABEL[w.kind], day: w.day });
  }

  // Échéances du kanban (cartes qui me sont assignées).
  const cards = await db
    .select({ id: kanbanCards.id, title: kanbanCards.title, due: kanbanCards.dueDate })
    .from(kanbanCardAssignees)
    .innerJoin(kanbanCards, eq(kanbanCards.id, kanbanCardAssignees.cardId))
    .where(and(eq(kanbanCardAssignees.userId, user.id), gte(kanbanCards.dueDate, since)));
  for (const c of cards) if (c.due) events.push({ uid: `card-${c.id}`, summary: `À rendre : ${c.title}`, day: c.due });

  // Évènements du BDE auxquels je suis inscrit.
  const regs = await db.select({ eventId: bdeRegistrations.eventId }).from(bdeRegistrations).where(eq(bdeRegistrations.userId, user.id));
  if (regs.length) {
    const evs = await db.select().from(bdeEvents).where(and(inArray(bdeEvents.id, regs.map((r) => r.eventId)), gte(bdeEvents.startsAt, new Date(Date.now() - 30 * 864e5))));
    for (const e of evs) events.push({ uid: `bde-${e.id}`, summary: e.title, description: e.description ?? undefined, location: e.location ?? undefined, start: e.startsAt, end: new Date(e.startsAt.getTime() + 2 * 3600e3) });
  }

  // Retours de matériel attendus.
  const due = await db
    .select({ id: loans.id, due: loans.dueDate, name: equipmentItems.name })
    .from(loans)
    .innerJoin(equipmentItems, eq(equipmentItems.id, loans.itemId))
    .where(and(eq(loans.userId, user.id), inArray(loans.status, ["reserved", "out"]), gte(loans.dueDate, since)));
  for (const l of due) events.push({ uid: `loan-${l.id}`, summary: `Retour du matériel : ${l.name}`, day: l.due });

  const now = stamp(new Date());
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Backstage//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:Backstage · ${esc(user.name)}`, "X-WR-TIMEZONE:Europe/Paris", "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H",
  ];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.uid}@backstage`, `DTSTAMP:${now}`);
    if ("day" in e) lines.push(`DTSTART;VALUE=DATE:${dateOnly(e.day)}`, `DTEND;VALUE=DATE:${dateOnly(nextDay(e.day))}`, "TRANSP:TRANSPARENT");
    else lines.push(`DTSTART:${stamp(e.start)}`, `DTEND:${stamp(e.end)}`);
    lines.push(`SUMMARY:${esc(e.summary)}`);
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
    if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
