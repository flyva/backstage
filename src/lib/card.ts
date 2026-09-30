import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tracks, userLinks, users, type LinkKind } from "@/db/schema";
import { avatarUrl } from "@/lib/avatar-files";
import { school3isEmail } from "@/lib/people-shared";

export type CardData = {
  name: string; firstName: string; lastName: string; avatar: string | null; headline: string | null; track: string | null;
  email: string | null; phone: string | null; links: { kind: LinkKind; url: string; label: string | null }[];
};

/** Carte de visite publique à partir de son adresse secrète (null si elle n'existe pas ou a été désactivée). */
export async function getCard(slug: string): Promise<CardData | null> {
  if (!/^[a-f0-9]{12}$/.test(slug)) return null;
  const [u] = await db.select().from(users).where(and(eq(users.cardSlug, slug), eq(users.cardEnabled, true), eq(users.status, "active"))).limit(1);
  if (!u) return null;
  const [t] = u.trackId ? await db.select({ name: tracks.name }).from(tracks).where(eq(tracks.id, u.trackId)).limit(1) : [];
  const links = await db.select().from(userLinks).where(eq(userLinks.userId, u.id)).orderBy(asc(userLinks.sortOrder));
  return {
    name: u.name, firstName: u.firstName, lastName: u.lastName, avatar: avatarUrl(u.avatarFile), headline: u.headline, track: t?.name ?? null,
    email: u.contactEmail || school3isEmail(u.email), // jamais l'adresse personnelle de connexion
    phone: u.cardShowPhone ? u.phone : null, // choix propre à la carte, indépendant de l'annuaire
    links: links.map((l) => ({ kind: l.kind, url: l.url, label: l.label })),
  };
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (c) => `\\${c}`);

export function toVCard(c: CardData): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:${esc(c.lastName)};${esc(c.firstName)};;;`, `FN:${esc(c.name)}`];
  if (c.headline) lines.push(`TITLE:${esc(c.headline)}`);
  if (c.track) lines.push(`NOTE:${esc(`Filière : ${c.track}`)}`);
  if (c.email) lines.push(`EMAIL;TYPE=INTERNET:${c.email}`);
  if (c.phone) lines.push(`TEL;TYPE=CELL:${c.phone.replace(/[^\d+]/g, "")}`);
  for (const l of c.links) lines.push(`URL:${l.url}`);
  lines.push("END:VCARD");
  return lines.join("\r\n") + "\r\n";
}
