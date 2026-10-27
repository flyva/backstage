import { asc } from "drizzle-orm";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { db } from "@/db";
import { companyStatuses } from "@/db/schema";
import { deleteCompanyStatus, moveCompanyStatus } from "@/lib/company-status-actions";
import { STATUS_DOT_CLASS } from "@/lib/company-status";
import { CompanyStatusForm } from "@/components/company-status-forms";
import { ConfirmButton } from "@/components/ConfirmButton";

export const metadata = { title: "Statuts entreprises" };

export default async function AdminCompanyStatusesPage() {
  const statuses = await db.select().from(companyStatuses).orderBy(asc(companyStatuses.position));

  return (
    <div className="space-y-6">
      <section className="card space-y-3">
        <h2 className="font-semibold">Ajouter un statut</h2>
        <p className="text-sm text-muted">
          Utilisé dans le tableau de suivi de <strong>Recherche entreprises</strong> : la couleur colore toute la ligne de l&apos;entreprise.
        </p>
        <CompanyStatusForm />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Statuts ({statuses.length})</h2>
        {statuses.length === 0 && <p className="text-sm text-muted">Aucun statut pour le moment.</p>}
        {statuses.map((s, i) => (
          <details key={s.id} className="card p-0">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-medium marker:hidden">
              <span className={`size-3 shrink-0 rounded-full ${STATUS_DOT_CLASS[s.color]}`} aria-hidden />
              {s.label}
              <span className="ml-auto font-mono text-xs text-muted">{s.key}</span>
            </summary>
            <div className="space-y-4 border-t border-line p-4">
              <CompanyStatusForm id={s.id} label={s.label} color={s.color} />
              <div className="flex items-center gap-2 border-t border-line pt-3">
                <form action={moveCompanyStatus}>
                  <input type="hidden" name="id" value={s.id} /><input type="hidden" name="dir" value="up" />
                  <button disabled={i === 0} className="btn-ghost text-xs disabled:opacity-40"><ArrowUp size={14} /> Monter</button>
                </form>
                <form action={moveCompanyStatus}>
                  <input type="hidden" name="id" value={s.id} /><input type="hidden" name="dir" value="down" />
                  <button disabled={i === statuses.length - 1} className="btn-ghost text-xs disabled:opacity-40"><ArrowDown size={14} /> Descendre</button>
                </form>
                <form action={deleteCompanyStatus} className="ml-auto">
                  <input type="hidden" name="id" value={s.id} />
                  <ConfirmButton message="Supprimer ce statut ? Les entreprises qui l'utilisaient afficheront un statut inconnu." className="flex items-center gap-1 text-xs text-muted hover:text-danger">
                    <Trash2 size={14} /> Supprimer
                  </ConfirmButton>
                </form>
              </div>
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
