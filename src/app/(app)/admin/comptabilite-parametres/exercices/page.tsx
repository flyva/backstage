import { CheckCircle2, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getFiscalYears } from "@/lib/finance-data";
import { deleteFiscalYear, setCurrentFiscalYear } from "@/lib/finance-actions";
import { FiscalYearForm } from "@/components/finance-forms";
import { FinanceSettingsTabs } from "@/components/FinanceSettingsTabs";
import { ConfirmButton } from "@/components/ConfirmButton";

export const metadata = { title: "Exercices comptables" };

// Paramètres comptabilité → Exercices : les écritures, imports et exports se rattachent à un exercice.
// Par défaut, tout prend le dernier exercice marqué « en cours ».
export default async function FinanceSettingsFiscalYearsPage() {
  await requireAdmin();
  const fiscalYears = await getFiscalYears();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Paramètres comptabilité</h2>
      <FinanceSettingsTabs active="/admin/comptabilite-parametres/exercices" />

      <section className="card space-y-3">
        <h3 className="font-semibold">Ajouter un exercice</h3>
        <FiscalYearForm />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Exercices ({fiscalYears.length})</h3>
        {fiscalYears.length === 0 && <p className="text-sm text-muted">Aucun exercice. Crée le premier (ex. « 2026-2027 »).</p>}
        {fiscalYears.map((f) => (
          <details key={f.id} className="card p-0">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 marker:hidden">
              <span className="min-w-0 flex-1 truncate font-medium">{f.label}</span>
              <span className="hidden text-xs text-muted sm:block">{f.startDate} → {f.endDate}</span>
              {f.isCurrent && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">En cours</span>}
            </summary>
            <div className="space-y-4 border-t border-line p-4">
              <FiscalYearForm id={f.id} label={f.label} startDate={f.startDate} endDate={f.endDate} isCurrent={f.isCurrent} />
              <div className="flex items-center gap-2 border-t border-line pt-3">
                {!f.isCurrent && (
                  <form action={setCurrentFiscalYear}>
                    <input type="hidden" name="id" value={f.id} />
                    <button className="btn-ghost text-xs"><CheckCircle2 size={14} /> Marquer en cours</button>
                  </form>
                )}
                <form action={deleteFiscalYear} className="ml-auto">
                  <input type="hidden" name="id" value={f.id} />
                  <ConfirmButton message={`Supprimer l'exercice « ${f.label} » ? Les écritures déjà liées resteront, mais sans exercice.`} className="flex items-center gap-1 text-xs text-muted hover:text-danger"><Trash2 size={14} /> Supprimer</ConfirmButton>
                </form>
              </div>
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
