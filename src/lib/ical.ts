import "server-only";
import https from "node:https";
import dns from "node:dns";
import net from "node:net";
import ICAL from "ical.js";
import { dayKey, parisParts, parisWallToDate } from "@/lib/paris";

export { dayKey };

const MAX_BYTES = 5 * 1024 * 1024;
const CACHE_TTL = 10 * 60e3;

// ---------- récupération sécurisée (anti-SSRF) ----------
// Le lien est fourni par l'utilisateur : on refuse tout ce qui n'est pas HTTPS public.

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  const v6 = ip.toLowerCase();
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v6);
  if (mapped) return isPrivateIp(mapped[1]);
  // Forme normalisée par URL : ::ffff:7f00:1 = 127.0.0.1
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(v6);
  if (hex) {
    const hi = parseInt(hex[1], 16);
    const lo = parseInt(hex[2], 16);
    return isPrivateIp(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe8") || v6.startsWith("fe9") || v6.startsWith("fea") || v6.startsWith("feb");
}

// `lookup` personnalisé : l'adresse validée est celle réellement utilisée (pas de DNS rebinding).
const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return (callback as (e: Error | null) => void)(err);
    const list = addresses as dns.LookupAddress[];
    if (list.length === 0 || list.some((a) => isPrivateIp(a.address))) {
      return (callback as (e: Error | null) => void)(new Error("Adresse non autorisée"));
    }
    if ((options as { all?: boolean }).all) return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
    callback(null, list[0].address, list[0].family);
  });
};

function download(url: string, redirects = 3, accept = "text/calendar, */*"): Promise<string> {
  return new Promise((resolve, reject) => {
    let u: URL;
    try { u = new URL(url); } catch { return reject(new Error("Lien invalide")); }
    if (u.protocol !== "https:") return reject(new Error("Le lien doit être en https"));
    if (u.port && u.port !== "443") return reject(new Error("Port non autorisé"));
    // Les IPv6 littérales arrivent entre crochets ([::1]) et court-circuitent le `lookup`.
    const host = u.hostname.replace(/^\[|\]$/g, "");
    if (net.isIP(host) && isPrivateIp(host)) return reject(new Error("Adresse non autorisée"));

    const req = https.get(u, { lookup: safeLookup, timeout: 10000, headers: { Accept: accept, "User-Agent": "Backstage/1.0" } }, (res) => {
      const status = res.statusCode ?? 0;
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume();
        if (redirects <= 0) return reject(new Error("Trop de redirections"));
        return download(new URL(res.headers.location, u).toString(), redirects - 1, accept).then(resolve, reject);
      }
      if (status !== 200) { res.resume(); return reject(new Error(`Réponse ${status} du serveur`)); }
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (c: Buffer) => {
        size += c.length;
        if (size > MAX_BYTES) { req.destroy(new Error("Fichier trop volumineux")); return; }
        chunks.push(c);
      });
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      res.on("error", reject);
    });
    req.on("timeout", () => req.destroy(new Error("Délai dépassé")));
    req.on("error", reject);
  });
}

/** Télécharge un texte depuis une URL publique (mêmes protections anti-SSRF que pour l'iCal). */
export const fetchPublicText = (url: string, accept = "application/json, */*") => download(url, 3, accept);

const g = globalThis as unknown as { __icalCache?: Map<string, { at: number; text: string }> };
const cache = (g.__icalCache ??= new Map());

export async function fetchIcal(url: string, { force = false } = {}): Promise<string> {
  const hit = cache.get(url);
  if (!force && hit && Date.now() - hit.at < CACHE_TTL) return hit.text;
  try {
    const text = await download(url);
    if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error("Ce lien ne renvoie pas un calendrier iCalendar");
    cache.set(url, { at: Date.now(), text });
    return text;
  } catch (e) {
    if (hit) return hit.text; // ancienne version plutôt qu'une page cassée
    throw e;
  }
}

export function clearIcalCache(url: string) {
  cache.delete(url);
}

// ---------- fuseau Europe/Paris ----------

function toDate(t: ICAL.Time): Date {
  // Heure flottante (sans fuseau) : on la lit comme une heure de Paris, quel que soit le fuseau du serveur.
  if (t.zone === ICAL.Timezone.localTimezone) return parisWallToDate(t.year, t.month, t.day, t.hour, t.minute, t.second);
  return t.toJSDate();
}

// ---------- évènements ----------

export type AgendaEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location: string;
  description: string;
};

export function parseEvents(text: string, from: Date, to: Date): AgendaEvent[] {
  const root = new ICAL.Component(ICAL.parse(text));
  for (const vtz of root.getAllSubcomponents("vtimezone")) {
    const tz = new ICAL.Timezone(vtz);
    if (!ICAL.TimezoneService.has(tz.tzid)) ICAL.TimezoneService.register(tz);
  }

  const out: AgendaEvent[] = [];
  const push = (ev: ICAL.Event, start: ICAL.Time, end: ICAL.Time, n: number) => {
    const s = toDate(start);
    const e = toDate(end);
    if (e < from || s > to) return;
    out.push({
      id: `${ev.uid}:${n}`,
      title: ev.summary || "(sans titre)",
      start: s,
      end: e,
      allDay: start.isDate,
      location: ev.location ?? "",
      description: ev.description ?? "",
    });
  };

  for (const vevent of root.getAllSubcomponents("vevent")) {
    const ev = new ICAL.Event(vevent);
    if (!ev.startDate) continue;
    if (ev.isRecurring()) {
      const it = ev.iterator();
      for (let n = 0, next = it.next(); next && n < 500; next = it.next(), n++) {
        if (toDate(next) > to) break;
        const d = ev.getOccurrenceDetails(next);
        push(ev, d.startDate, d.endDate, n);
      }
    } else {
      push(ev, ev.startDate, ev.endDate ?? ev.startDate, 0);
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

// ---------- semaines ----------

/** Les 7 jours (lundi → dimanche) de la semaine décalée de `offset` semaines. */
export function weekDays(offset: number): { key: string; date: Date }[] {
  const now = parisParts(new Date());
  const base = new Date(Date.UTC(now.y, now.mo - 1, now.d, 12));
  const dow = (base.getUTCDay() + 6) % 7; // lundi = 0
  base.setUTCDate(base.getUTCDate() - dow + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    return { key, date: d };
  });
}

export async function getEvents(url: string, from: Date, to: Date, opts?: { force?: boolean }) {
  const text = await fetchIcal(url, opts);
  return parseEvents(text, from, to);
}

/** Bornes larges (jour précédent → jour suivant) pour ne rien rater avec les fuseaux. */
export function rangeOfWeek(days: { key: string }[]) {
  const from = new Date(`${days[0].key}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - 1);
  const to = new Date(`${days[6].key}T23:59:59Z`);
  to.setUTCDate(to.getUTCDate() + 1);
  return { from, to };
}
