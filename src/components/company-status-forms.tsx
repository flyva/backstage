"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions";
import { saveCompanyStatus } from "@/lib/company-status-actions";
import { STATUS_COLOR_LABEL, STATUS_COLOR_ORDER, STATUS_DOT_CLASS, type StatusColor } from "@/lib/company-status";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

export function CompanyStatusForm({ id, label = "", color = "zinc" }: { id?: number; label?: string; color?: StatusColor }) {
  const [state, action, pending] = useActionState(saveCompanyStatus, undefined);
  return (
    <form action={action} className="space-y-3">
      {id && <input type="hidden" name="id" value={id} />}
      <div>
        <label className="label" htmlFor={`cs-label${id ?? "new"}`}>Nom du statut</label>
        <input id={`cs-label${id ?? "new"}`} name="label" defaultValue={label} required maxLength={60} className="input" placeholder="Ex. Entretien prévu" />
      </div>
      <div>
        <label className="label">Couleur</label>
        <div className="flex flex-wrap gap-2">
          {STATUS_COLOR_ORDER.map((c) => (
            <label key={c} className="cursor-pointer">
              <input type="radio" name="color" value={c} defaultChecked={c === color} className="peer sr-only" />
              <span
                className={`flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs peer-checked:border-accent peer-checked:bg-accent/10 peer-checked:font-medium peer-focus-visible:ring-2 peer-focus-visible:ring-accent`}
              >
                <span className={`size-3 rounded-full ${STATUS_DOT_CLASS[c]}`} aria-hidden /> {STATUS_COLOR_LABEL[c]}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn" disabled={pending}>{pending ? "…" : id ? "Enregistrer" : "Ajouter"}</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
