import { asc, count } from "drizzle-orm";
import { db } from "@/db";
import { tracks, users } from "@/db/schema";
import { TrackForm } from "@/components/people-forms";

export const metadata = { title: "Filières" };

export default async function AdminTracksPage() {
  const [list, counts] = await Promise.all([
    db.select().from(tracks).orderBy(asc(tracks.sortOrder), asc(tracks.name)),
    db.select({ trackId: users.trackId, n: count() }).from(users).groupBy(users.trackId),
  ]);
  const n = new Map(counts.map((c) => [c.trackId, c.n]));
  return (
    <div className="space-y-5">
      <section className="card space-y-3">
        <h2 className="font-semibold">Filières de l&apos;école</h2>
        <p className="text-sm text-muted">Chaque personne choisit sa filière dans son profil. Elle sert de filtre dans l&apos;annuaire.</p>
        <ul className="divide-y divide-line">
          {list.map((t) => (
            <li key={t.id} className="space-y-1 py-3">
              <TrackForm track={t} />
              <p className="text-xs text-muted">{n.get(t.id) ?? 0} personne{(n.get(t.id) ?? 0) > 1 ? "s" : ""}</p>
            </li>
          ))}
          {list.length === 0 && <li className="py-3 text-sm text-muted">Aucune filière pour le moment.</li>}
        </ul>
      </section>
      <section className="card space-y-3">
        <h2 className="font-semibold">Ajouter une filière</h2>
        <TrackForm />
      </section>
    </div>
  );
}
