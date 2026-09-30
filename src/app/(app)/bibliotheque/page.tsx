import { asc, eq } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { db } from "@/db";
import { fixtureModels, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { deleteFixture } from "@/lib/library-actions";
import { FixtureForm } from "@/components/library-forms";

export const metadata = { title: "Bibliothèque d'appareils" };

export default async function FixtureLibraryPage({ searchParams }: PageProps<"/bibliotheque">) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().toLowerCase().slice(0, 80);

  const rows = await db
    .select({ f: fixtureModels, author: users.name })
    .from(fixtureModels)
    .innerJoin(users, eq(users.id, fixtureModels.createdBy))
    .orderBy(asc(fixtureModels.name), asc(fixtureModels.mode));
  const list = q ? rows.filter(({ f }) => `${f.name} ${f.mode ?? ""} ${f.notes ?? ""}`.toLowerCase().includes(q)) : rows;
  const canManage = (createdBy: number) => user.id === createdBy || user.perms.materiel;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Ces appareils sont proposés quand tu ajoutes un projecteur à la fiche lumière d&apos;un projet (nom, mode DMX et nombre de canaux se remplissent tout seuls). La puissance sert au calcul de charge électrique.
      </p>

      <section className="card space-y-3">
        <h2 className="font-semibold">Ajouter un appareil</h2>
        <FixtureForm />
      </section>

      <section className="space-y-3">
        <form role="search" className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Rechercher un appareil…" aria-label="Rechercher" className="input max-w-xs" />
          <button className="btn-ghost">Rechercher</button>
        </form>
        <h2 className="font-semibold">Appareils ({list.length})</h2>
        {list.length === 0 && <p className="text-sm text-muted">Aucun appareil.</p>}
        {list.map(({ f, author }) => (
          <details key={f.id} className="card p-0">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 marker:hidden">
              <span className="min-w-0 flex-1 font-medium">{f.name}</span>
              {f.mode && <span className="text-xs text-muted">{f.mode}</span>}
              <span className="text-xs tabular-nums text-muted">{f.footprint} ch</span>
              {f.watts !== null && <span className="text-xs tabular-nums text-muted">{f.watts} W</span>}
            </summary>
            <div className="space-y-3 border-t border-line p-4">
              <p className="text-xs text-muted">Ajouté par {author}</p>
              {canManage(f.createdBy) ? (
                <>
                  <FixtureForm id={f.id} name={f.name} mode={f.mode ?? ""} footprint={f.footprint} watts={f.watts ?? ""} notes={f.notes ?? ""} />
                  <form action={deleteFixture} className="border-t border-line pt-3">
                    <input type="hidden" name="id" value={f.id} />
                    <button className="flex items-center gap-1 text-xs text-muted hover:text-danger"><Trash2 size={14} /> Supprimer</button>
                  </form>
                </>
              ) : (
                f.notes && <p className="text-sm">{f.notes}</p>
              )}
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
