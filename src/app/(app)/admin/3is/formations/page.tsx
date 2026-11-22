import { asc, count } from "drizzle-orm";
import { db } from "@/db";
import { domaines, tracks, users } from "@/db/schema";
import { TrackForm } from "@/components/people-forms";

export const metadata = { title: "Formations" };

export default async function AdminFormationsPage() {
  const [list, counts, allDomaines] = await Promise.all([
    db.select().from(tracks).orderBy(asc(tracks.sortOrder), asc(tracks.name)),
    db.select({ trackId: users.trackId, n: count() }).from(users).groupBy(users.trackId),
    db.select().from(domaines).orderBy(asc(domaines.sortOrder), asc(domaines.name)),
  ]);
  const n = new Map(counts.map((c) => [c.trackId, c.n]));
  const domaineName = new Map(allDomaines.map((d) => [d.id, d.name]));
  return (
    <div className="space-y-5">
      <section className="card space-y-3">
        <h2 className="font-semibold">Formations</h2>
        <p className="text-sm text-muted">Nom entier, diminutif (pour les tags « RT1 », « ACTING2 »…), domaine et nombre d&apos;années. Chaque personne peut en suivre plusieurs au fil de son cursus (onglet Ma promo du profil).</p>
        <ul className="divide-y divide-line">
          {list.map((t) => (
            <li key={t.id} className="space-y-1 py-3">
              <TrackForm track={t} domaines={allDomaines} />
              <p className="text-xs text-muted">
                {domaineName.get(t.domaineId ?? -1) ?? "Sans domaine"} · {t.yearsCount} année{t.yearsCount > 1 ? "s" : ""} · {n.get(t.id) ?? 0} personne{(n.get(t.id) ?? 0) > 1 ? "s" : ""} en formation principale
              </p>
            </li>
          ))}
          {list.length === 0 && <li className="py-3 text-sm text-muted">Aucune formation pour le moment.</li>}
        </ul>
      </section>
      <section className="card space-y-3">
        <h2 className="font-semibold">Ajouter une formation</h2>
        <TrackForm domaines={allDomaines} />
      </section>
    </div>
  );
}
