import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tracks, trackReferents, users } from "@/db/schema";
import { ReferentAssignForm } from "@/components/people-forms";
import { removeTrackReferent } from "@/lib/people-actions";
import { Trash2 } from "lucide-react";
import { ProjectTabs } from "@/components/ProjectTabs";

export const metadata = { title: "Référents" };

export default async function AdminReferentsPage() {
  const [allTracks, allUsers, assignments] = await Promise.all([
    db.select().from(tracks).orderBy(asc(tracks.sortOrder), asc(tracks.name)),
    db.select({ id: users.id, name: users.name }).from(users).where(eq(users.status, "active")).orderBy(asc(users.name)),
    db.select({ userId: trackReferents.userId, trackId: trackReferents.trackId, userName: users.name, trackName: tracks.name })
      .from(trackReferents).innerJoin(users, eq(trackReferents.userId, users.id)).innerJoin(tracks, eq(trackReferents.trackId, tracks.id))
      .orderBy(asc(tracks.name), asc(users.name)),
  ]);
  const byTrack = new Map<number, { userId: number; userName: string; trackName: string }[]>();
  for (const a of assignments) byTrack.set(a.trackId, [...(byTrack.get(a.trackId) ?? []), a]);

  return (
    <div className="space-y-5">
      <ProjectTabs base="/admin/3is" tabs={[{ slug: "utilisateurs", label: "Utilisateurs" }, { slug: "referents", label: "Référents" }]} label="Utilisateurs et référents" />
      <section className="card space-y-3">
        <h2 className="font-semibold">Référents de filière</h2>
        <p className="text-sm text-muted">
          Personnel permanent 3IS chargé du suivi des étudiant·e·s d&apos;une ou plusieurs formations : aucune année associée (toujours
          référent de « sa » filière). Le référent peut ensuite filtrer les plannings de ses étudiant·e·s par filière.
        </p>
        {allTracks.length === 0 && <p className="text-sm text-muted">Aucune formation pour le moment.</p>}
        {allTracks.map((t) => {
          const list = byTrack.get(t.id) ?? [];
          if (list.length === 0) return null;
          return (
            <div key={t.id} className="rounded-xl border border-line p-3">
              <h3 className="text-sm font-semibold">{t.name}</h3>
              <ul className="mt-2 space-y-1">
                {list.map((a) => (
                  <li key={a.userId} className="flex items-center justify-between text-sm">
                    <span>{a.userName}</span>
                    <form action={removeTrackReferent}>
                      <input type="hidden" name="userId" value={a.userId} />
                      <input type="hidden" name="trackId" value={t.id} />
                      <button type="submit" className="text-muted hover:text-danger" aria-label={`Retirer ${a.userName} comme référent de ${t.name}`}><Trash2 size={14} /></button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {assignments.length === 0 && <p className="text-sm text-muted">Aucun référent pour le moment.</p>}
      </section>
      <section className="card space-y-3">
        <h2 className="font-semibold">Ajouter un référent</h2>
        <ReferentAssignForm users={allUsers} tracks={allTracks.map((t) => ({ id: t.id, name: t.name }))} />
      </section>
    </div>
  );
}
