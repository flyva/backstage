import { asc, count } from "drizzle-orm";
import { db } from "@/db";
import { domaines, tracks } from "@/db/schema";
import { DomaineForm } from "@/components/people-forms";
import { ProjectTabs } from "@/components/ProjectTabs";

export const metadata = { title: "Domaines" };

export default async function AdminDomainesPage() {
  const [list, counts] = await Promise.all([
    db.select().from(domaines).orderBy(asc(domaines.sortOrder), asc(domaines.name)),
    db.select({ domaineId: tracks.domaineId, n: count() }).from(tracks).groupBy(tracks.domaineId),
  ]);
  const n = new Map(counts.map((c) => [c.domaineId, c.n]));
  return (
    <div className="space-y-5">
      <ProjectTabs base="/admin/3is" tabs={[{ slug: "formations", label: "Formations" }, { slug: "domaines", label: "Domaines" }]} label="Formations et domaines" />
      <section className="card space-y-3">
        <h2 className="font-semibold">Domaines</h2>
        <p className="text-sm text-muted">Regroupent les formations (ex. « Technique », « Jeu d&apos;acteur »). Géré dans Formations.</p>
        <ul className="divide-y divide-line">
          {list.map((d) => (
            <li key={d.id} className="space-y-1 py-3">
              <DomaineForm domaine={d} />
              <p className="text-xs text-muted">{n.get(d.id) ?? 0} formation{(n.get(d.id) ?? 0) > 1 ? "s" : ""}</p>
            </li>
          ))}
          {list.length === 0 && <li className="py-3 text-sm text-muted">Aucun domaine pour le moment.</li>}
        </ul>
      </section>
      <section className="card space-y-3">
        <h2 className="font-semibold">Ajouter un domaine</h2>
        <DomaineForm />
      </section>
    </div>
  );
}
