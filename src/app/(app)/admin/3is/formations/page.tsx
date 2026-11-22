import { asc } from "drizzle-orm";
import { db } from "@/db";
import { domaines, tracks } from "@/db/schema";
import { TrackForm, TracksTable } from "@/components/people-forms";
import { ProjectTabs } from "@/components/ProjectTabs";

export const metadata = { title: "Formations" };

export default async function AdminFormationsPage() {
  const [list, allDomaines] = await Promise.all([
    db.select().from(tracks).orderBy(asc(tracks.sortOrder), asc(tracks.name)),
    db.select().from(domaines).orderBy(asc(domaines.sortOrder), asc(domaines.name)),
  ]);
  return (
    <div className="space-y-5">
      <ProjectTabs base="/admin/3is" tabs={[{ slug: "formations", label: "Formations" }, { slug: "domaines", label: "Domaines" }]} label="Formations et domaines" />
      <section className="card space-y-3">
        <h2 className="font-semibold">Formations</h2>
        <p className="text-sm text-muted">Nom entier, diminutif (pour les tags « RT1 », « ACTING2 »…), domaine et nombre d&apos;années. Chaque personne peut en suivre plusieurs au fil de son cursus (onglet Ma promo du profil).</p>
        <TracksTable tracks={list} domaines={allDomaines} />
      </section>
      <section className="card space-y-3">
        <h2 className="font-semibold">Ajouter une formation</h2>
        <TrackForm domaines={allDomaines} />
      </section>
    </div>
  );
}
