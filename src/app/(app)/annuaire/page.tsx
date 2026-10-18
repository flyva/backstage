import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { classes, tracks, userLinks, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { avatarUrl } from "@/lib/avatar-files";
import { onlineUserIds } from "@/lib/presence";
import { school3isEmail } from "@/lib/people-shared";
import { Directory, type Person } from "@/components/Directory";

export const metadata = { title: "Annuaire" };

export default async function AnnuairePage() {
  await requireUser();
  const [allTracks, allClasses, rows] = await Promise.all([
    db.select().from(tracks).orderBy(asc(tracks.sortOrder), asc(tracks.name)),
    db.select().from(classes).orderBy(asc(classes.sortOrder), asc(classes.name)),
    db.select().from(users).where(and(eq(users.status, "active"), eq(users.showInDirectory, true))).orderBy(asc(users.lastName), asc(users.firstName)),
  ]);
  const links = rows.length ? await db.select().from(userLinks).where(inArray(userLinks.userId, rows.map((r) => r.id))).orderBy(asc(userLinks.sortOrder)) : [];
  const trackName = new Map(allTracks.map((t) => [t.id, t.name]));
  const className = new Map(allClasses.map((c) => [c.id, c.name]));
  const online = onlineUserIds(rows.map((u) => u.id));
  const people: Person[] = rows.map((u) => ({
    id: u.id,
    name: u.name,
    avatar: avatarUrl(u.avatarFile),
    online: online.has(u.id),
    trackId: u.trackId,
    track: u.trackId ? trackName.get(u.trackId) ?? null : null,
    classId: u.classId,
    className: u.classId ? className.get(u.classId) ?? null : null,
    headline: u.headline,
    email3is: school3isEmail(u.email), // adresse 3IS seulement si le compte en a une
    phone: u.showPhone ? u.phone : null,
    discord: u.discord, // visible dans l'annuaire dès qu'il est renseigné
    habilitation: u.habilitation, // idem
    company: u.showCompany ? u.companyName : null, // nom de l'entreprise seulement (jamais l'adresse), si la personne l'a choisi
    links: links.filter((l) => l.userId === u.id).map((l) => ({ kind: l.kind, url: l.url, label: l.label })),
    cardUrl: u.cardEnabled && u.cardSlug ? `/carte/${u.cardSlug}` : null,
  }));
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Annuaire de la promo</h1>
        <p className="text-sm text-muted">Les personnes de Backstage, leur filière et leurs réseaux. Complète ta fiche dans ton profil pour y apparaître.</p>
      </header>
      <Directory people={people} tracks={allTracks.map((t) => ({ id: t.id, name: t.name }))} classes={allClasses.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
