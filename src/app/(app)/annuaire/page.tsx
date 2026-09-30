import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { tracks, userLinks, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { avatarUrl } from "@/lib/avatar-files";
import { school3isEmail } from "@/lib/people-shared";
import { Directory, type Person } from "@/components/Directory";

export const metadata = { title: "Annuaire" };

export default async function AnnuairePage() {
  await requireUser();
  const [allTracks, rows] = await Promise.all([
    db.select().from(tracks).orderBy(asc(tracks.sortOrder), asc(tracks.name)),
    db.select().from(users).where(and(eq(users.status, "active"), eq(users.showInDirectory, true))).orderBy(asc(users.lastName), asc(users.firstName)),
  ]);
  const links = rows.length ? await db.select().from(userLinks).where(inArray(userLinks.userId, rows.map((r) => r.id))).orderBy(asc(userLinks.sortOrder)) : [];
  const trackName = new Map(allTracks.map((t) => [t.id, t.name]));
  const people: Person[] = rows.map((u) => ({
    id: u.id,
    name: u.name,
    avatar: avatarUrl(u.avatarFile),
    trackId: u.trackId,
    track: u.trackId ? trackName.get(u.trackId) ?? null : null,
    headline: u.headline,
    email3is: school3isEmail(u.email), // adresse 3IS seulement si le compte en a une
    phone: u.showPhone ? u.phone : null,
    links: links.filter((l) => l.userId === u.id).map((l) => ({ kind: l.kind, url: l.url, label: l.label })),
    cardUrl: u.cardEnabled && u.cardSlug ? `/carte/${u.cardSlug}` : null,
  }));
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Annuaire de la promo</h1>
        <p className="text-sm text-muted">Les personnes de Backstage, leur filière et leurs réseaux. Complète ta fiche dans ton profil pour y apparaître.</p>
      </header>
      <Directory people={people} tracks={allTracks.map((t) => ({ id: t.id, name: t.name }))} />
    </div>
  );
}
