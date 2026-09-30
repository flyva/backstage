"use client";

import { useActionState, useTransition, useState } from "react";
import { DatabaseZap } from "lucide-react";
import type { FormState } from "@/lib/actions";
import { importGuide, saveContact } from "@/lib/guide-actions";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400" role="status">{state.ok}</p>;
  return null;
}

/** Importe le guide de rentrée de l'école (annuaire, FAQ, liens, wiki, réglages). Relançable sans risque. */
export function ImportGuideButton() {
  const [state, setState] = useState<FormState>(undefined);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <button type="button" className="btn" disabled={pending} onClick={() => start(async () => setState(await importGuide()))}>
        <DatabaseZap size={16} /> {pending ? "Import en cours…" : "Importer le guide de rentrée 2026-2027"}
      </button>
      <Feedback state={state} />
    </div>
  );
}

export function ContactForm({ groups, contact }: { groups: string[]; contact?: { id: number; groupName: string; name: string; role: string; email: string; phone: string; note: string } }) {
  const [state, action, pending] = useActionState(saveContact, undefined);
  const c = contact;
  const k = c?.id ?? "new";
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2" key={c ? `e${c.id}` : state?.ok ? "done" : "new"}>
      {c && <input type="hidden" name="id" value={c.id} />}
      <div><label className="label" htmlFor={`cn${k}`}>Nom</label><input id={`cn${k}`} name="name" defaultValue={c?.name} required maxLength={120} className="input" /></div>
      <div>
        <label className="label" htmlFor={`cg${k}`}>Groupe</label>
        <input id={`cg${k}`} name="groupName" defaultValue={c?.groupName} required maxLength={80} list="contact-groups" className="input" />
        <datalist id="contact-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
      </div>
      <div className="sm:col-span-2"><label className="label" htmlFor={`cr${k}`}>Fonction</label><input id={`cr${k}`} name="role" defaultValue={c?.role} maxLength={160} className="input" /></div>
      <div><label className="label" htmlFor={`ce${k}`}>E-mail</label><input id={`ce${k}`} name="email" type="email" defaultValue={c?.email} maxLength={190} className="input" /></div>
      <div><label className="label" htmlFor={`cp${k}`}>Téléphone</label><input id={`cp${k}`} name="phone" defaultValue={c?.phone} maxLength={30} className="input" /></div>
      <div className="sm:col-span-2"><label className="label" htmlFor={`co${k}`}>Note (facultatif)</label><input id={`co${k}`} name="note" defaultValue={c?.note} maxLength={300} className="input" /></div>
      <div className="space-y-2 sm:col-span-2">
        <Feedback state={state} />
        <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : c ? "Enregistrer" : "Ajouter le contact"}</button>
      </div>
    </form>
  );
}
