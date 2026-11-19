import { Crown } from "lucide-react";
import { getBdeMembers } from "@/lib/association-data";
import { BDE_STATUS_LABEL, sortByOfficerTitle } from "@/lib/association";

export const metadata = { title: "Organigramme" };

// Organigramme du BDE : bureau (avec qualification), membres du CA, puis liste simple. Lecture seule, accessible
// à tous ceux qui ont accès au module BDE ; l'édition se fait côté admin (fiche personne → Statut BDE).
export default async function OrganigrammePage() {
  const members = await getBdeMembers();
  const bureau = sortByOfficerTitle(members.filter((m) => m.bdeStatus === "bureau"));
  const ca = members.filter((m) => m.bdeStatus === "ca");
  const liste = members.filter((m) => m.bdeStatus === "liste");

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{BDE_STATUS_LABEL.bureau}</h2>
        {bureau.length === 0 ? (
          <p className="text-sm text-muted">Aucun membre du bureau renseigné pour l&apos;instant.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bureau.map((m) => (
              <div key={m.id} className="card flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent"><Crown size={20} /></span>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{m.name}</div>
                  <div className="truncate text-xs text-muted">{m.bdeTitle}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {ca.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{BDE_STATUS_LABEL.ca}</h2>
          <ul className="card divide-y divide-line">
            {ca.map((m) => <li key={m.id} className="py-2 first:pt-0 last:pb-0">{m.name}</li>)}
          </ul>
        </section>
      )}

      {liste.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{BDE_STATUS_LABEL.liste}</h2>
          <ul className="card flex flex-wrap gap-2 p-4">
            {liste.map((m) => <li key={m.id} className="rounded-full bg-bg px-3 py-1 text-sm">{m.name}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
