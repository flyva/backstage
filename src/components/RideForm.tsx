"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions";
import { saveRide } from "@/lib/ride-actions";
import { AddressField } from "@/components/AddressField";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

export function RideForm({ id, title = "", fromPlace = "", toPlace = "", departsAt = "", seats = 3, notes = "" }: { id?: number; title?: string; fromPlace?: string; toPlace?: string; departsAt?: string; seats?: number; notes?: string }) {
  const [state, action, pending] = useActionState(saveRide, undefined);
  const k = id ?? "new";
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-6" key={id ? `e${id}` : state?.ok ? "done" : "new"}>
      {id && <input type="hidden" name="id" value={id} />}
      <div className="sm:col-span-6"><label className="label" htmlFor={`rt${k}`}>Pour quoi ?</label><input id={`rt${k}`} name="title" defaultValue={title} required maxLength={150} placeholder="Soirée BDE, montage au théâtre, sortie…" className="input" /></div>
      <div className="sm:col-span-3"><AddressField id={`rf${k}`} name="fromPlace" label="Départ" defaultValue={fromPlace} placeholder="Ville ou adresse de départ" /></div>
      <div className="sm:col-span-3"><AddressField id={`rd${k}`} name="toPlace" label="Arrivée" defaultValue={toPlace} placeholder="Ville ou adresse d'arrivée" /></div>
      <div className="sm:col-span-3"><label className="label" htmlFor={`ra${k}`}>Départ le</label><input id={`ra${k}`} name="departsAt" type="datetime-local" defaultValue={departsAt} required className="input" /></div>
      <div className="sm:col-span-3"><label className="label" htmlFor={`rs${k}`}>Places disponibles</label><input id={`rs${k}`} name="seats" type="number" min={1} max={8} defaultValue={seats} required className="input" /></div>
      <div className="sm:col-span-6"><label className="label" htmlFor={`rn${k}`}>Infos (point de rendez-vous, bagages, participation aux frais…)</label><input id={`rn${k}`} name="notes" defaultValue={notes} maxLength={300} className="input" /></div>
      <div className="space-y-2 sm:col-span-6">
        <Feedback state={state} />
        <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : id ? "Enregistrer" : "Proposer ce trajet"}</button>
      </div>
    </form>
  );
}
