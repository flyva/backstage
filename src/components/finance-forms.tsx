"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions";
import type { FinanceCategory, FinanceDirection } from "@/db/schema";
import { CATEGORY_LABEL, DIRECTION_LABEL } from "@/lib/finance";
import { saveFinancialEntry } from "@/lib/finance-actions";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

export type FinanceEntryValues = {
  id?: number;
  direction?: FinanceDirection;
  category?: FinanceCategory;
  label?: string;
  amount?: number; // en euros
  occurredOn?: string;
  method?: string;
  reference?: string;
  notes?: string;
};

/** Mêmes champs que le formulaire « Nouvelle écriture » d'Oasis, sans le champ Association (un seul BDE ici). */
export function FinanceEntryForm({ today, ...entry }: FinanceEntryValues & { today: string }) {
  const [state, action, pending] = useActionState(saveFinancialEntry, undefined);
  return (
    <form action={action} className="space-y-4">
      {entry.id && <input type="hidden" name="id" value={entry.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="fe-direction">Sens</label>
          <select id="fe-direction" name="direction" defaultValue={entry.direction ?? "expense"} className="input">
            {(Object.keys(DIRECTION_LABEL) as FinanceDirection[]).map((d) => <option key={d} value={d}>{DIRECTION_LABEL[d]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="fe-amount">Montant (€)</label>
          <input id="fe-amount" name="amount" type="number" step="0.01" min="0.01" required defaultValue={entry.amount} placeholder="0.00" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="fe-date">Date</label>
          <input id="fe-date" name="occurredOn" type="date" required defaultValue={entry.occurredOn ?? today} max={today} className="input" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="fe-label">Libellé</label>
        <input id="fe-label" name="label" required maxLength={200} defaultValue={entry.label} className="input" />
      </div>

      <div>
        <label className="label" htmlFor="fe-category">Poste analytique</label>
        <select id="fe-category" name="category" defaultValue={entry.category ?? "autre"} className="input">
          {(Object.keys(CATEGORY_LABEL) as FinanceCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="fe-method">Moyen de paiement (facultatif)</label>
          <input id="fe-method" name="method" maxLength={40} defaultValue={entry.method} placeholder="Virement, CB, chèque, espèces…" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="fe-reference">Référence / pièce (facultatif)</label>
          <input id="fe-reference" name="reference" maxLength={120} defaultValue={entry.reference} placeholder="N° facture, chèque…" className="input" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="fe-notes">Notes (facultatif)</label>
        <textarea id="fe-notes" name="notes" rows={2} maxLength={2000} defaultValue={entry.notes} className="input" />
      </div>

      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
    </form>
  );
}

/** Formulaire de filtres (année/sens/poste) de la page Comptabilité : se soumet seul au changement. */
export function FinanceFilterForm({ years, year, direction, category }: { years: number[]; year: number; direction?: FinanceDirection; category?: FinanceCategory }) {
  return (
    <form method="get" className="card flex flex-wrap items-end gap-3">
      <div>
        <label className="label" htmlFor="f-year">Année</label>
        <select id="f-year" name="year" defaultValue={year} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="input w-auto">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="f-direction">Sens</label>
        <select id="f-direction" name="direction" defaultValue={direction ?? ""} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="input w-auto">
          <option value="">Tous</option>
          {(Object.keys(DIRECTION_LABEL) as FinanceDirection[]).map((d) => <option key={d} value={d}>{DIRECTION_LABEL[d]}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="f-category">Poste</label>
        <select id="f-category" name="category" defaultValue={category ?? ""} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="input w-auto">
          <option value="">Tous</option>
          {(Object.keys(CATEGORY_LABEL) as FinanceCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
        </select>
      </div>
      {(direction || category) && <a href={`?year=${year}`} className="btn-ghost">Réinitialiser</a>}
    </form>
  );
}
