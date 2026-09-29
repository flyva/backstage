"use client";

import { useActionState } from "react";
import { CUE_CATEGORIES } from "@/db/schema";
import { CATEGORY_LABEL } from "@/lib/time";
import type { FormState } from "@/lib/actions";
import { addCue, updateCue } from "@/lib/project-actions";

type Defaults = { number?: string; title?: string; category?: string; duration?: string; notes?: string };

function Fields({ d }: { d: Defaults }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[6rem_1fr_9rem_7rem]">
        <div>
          <label className="label">N°</label>
          <input name="number" defaultValue={d.number} maxLength={20} placeholder="auto" className="input" />
        </div>
        <div>
          <label className="label">Titre</label>
          <input name="title" defaultValue={d.title} required maxLength={200} placeholder="Noir plateau, entrée du chanteur…" className="input" />
        </div>
        <div>
          <label className="label">Catégorie</label>
          <select name="category" defaultValue={d.category ?? "lumiere"} className="input">
            {CUE_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Durée</label>
          <input name="duration" defaultValue={d.duration} placeholder="2:30" className="input" />
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea name="notes" defaultValue={d.notes} rows={2} maxLength={2000} placeholder="Mémoire, effet, consigne, top départ…" className="input" />
      </div>
    </>
  );
}

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

export function AddCueForm({ projectId }: { projectId: number }) {
  const [state, action, pending] = useActionState(addCue, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      <Fields d={{}} />
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Ajout…" : "Ajouter la cue"}</button>
    </form>
  );
}

export function EditCueForm({ cueId, defaults }: { cueId: number; defaults: Defaults }) {
  const [state, action, pending] = useActionState(updateCue, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="cueId" value={cueId} />
      <Fields d={defaults} />
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
    </form>
  );
}
