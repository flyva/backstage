"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions";
import { saveUpdate } from "@/lib/update-actions";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

export function UpdateForm({ id, title = "", body = "", publishUntil = "" }: { id?: number; title?: string; body?: string; publishUntil?: string }) {
  const [state, action, pending] = useActionState(saveUpdate, undefined);
  const k = id ?? "new";
  return (
    <form action={action} className="space-y-3" key={id ? `e${id}` : state?.ok ? "done" : "new"}>
      {id && <input type="hidden" name="id" value={id} />}
      <div>
        <label className="label" htmlFor={`ut${k}`}>Titre</label>
        <input id={`ut${k}`} name="title" defaultValue={title} required minLength={2} maxLength={150} className="input" placeholder="Nouveau : page Tickets" />
      </div>
      <div>
        <label className="label" htmlFor={`ub${k}`}>Détail</label>
        <textarea id={`ub${k}`} name="body" defaultValue={body} required minLength={2} maxLength={4000} rows={4} className="input" placeholder="Ce qui a changé, pourquoi, comment l'utiliser…" />
      </div>
      <div>
        <label className="label" htmlFor={`up${k}`}>Afficher jusqu&apos;au (facultatif)</label>
        <input id={`up${k}`} name="publishUntil" type="date" defaultValue={publishUntil} className="input w-auto" />
        <p className="mt-1 text-xs text-muted">Passé cette date, la nouveauté n&apos;est plus affichée (cloche, page Nouveautés) mais reste enregistrée ici, modifiable à tout moment. Vide = affichée sans limite de durée.</p>
      </div>
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : id ? "Enregistrer" : "Publier"}</button>
    </form>
  );
}
