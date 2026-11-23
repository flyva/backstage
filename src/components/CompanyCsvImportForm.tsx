"use client";

import { useActionState } from "react";
import { Download, FileUp } from "lucide-react";
import type { FormState } from "@/lib/actions";
import { importCompaniesCsv } from "@/lib/company-search-actions";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

// Déplacé depuis l'annuaire (CompanyDirectory.tsx) : l'import CSV est une action d'administration, pas un geste de
// tous les jours pour chaque personne qui consulte l'annuaire.
export function CompanyCsvImportForm() {
  const [state, action, pending] = useActionState(importCompaniesCsv, undefined);
  return (
    <form action={action} className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Importer un CSV</h2>
          <p className="text-sm text-muted">
            Les entreprises rejoignent l&apos;annuaire partagé (sans doublon par nom + ville) ; le statut, la priorité et le reste du
            suivi vont dans <strong>ton</strong> tableau uniquement.
          </p>
        </div>
        <a href="/admin/demarchage/annuaire/modele.csv" className="btn-ghost shrink-0 text-xs"><Download size={14} /> Fichier modèle</a>
      </div>
      <input name="file" type="file" accept=".csv,text/csv" required className="input" />
      <div className="flex items-center gap-3">
        <button className="btn" disabled={pending}><FileUp size={15} /> {pending ? "Import…" : "Importer"}</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
