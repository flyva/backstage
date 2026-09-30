"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions";
import { MarkdownField } from "@/components/MarkdownField";
import { createPoll, saveEvent, submitIdea } from "@/lib/bde-actions";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

type EventDefaults = { id?: number; title?: string; description?: string; startsAt?: string; location?: string; capacity?: number | null };

export function EventForm({ event }: { event?: EventDefaults }) {
  const [state, action, pending] = useActionState(saveEvent, undefined);
  const d = event ?? {};
  return (
    <form action={action} className="space-y-3">
      {d.id && <input type="hidden" name="eventId" value={d.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Titre</label>
          <input name="title" defaultValue={d.title} required maxLength={200} placeholder="Soirée de rentrée" className="input" />
        </div>
        <div>
          <label className="label">Date et heure</label>
          <input name="startsAt" type="datetime-local" defaultValue={d.startsAt} required className="input" />
        </div>
        <div>
          <label className="label">Lieu</label>
          <input name="location" defaultValue={d.location} maxLength={200} className="input" />
        </div>
        <div>
          <label className="label">Places (vide = illimité)</label>
          <input name="capacity" type="number" min={1} max={5000} defaultValue={d.capacity ?? ""} className="input" />
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <MarkdownField name="description" defaultValue={d.description} rows={5} maxLength={5000} label="Description" />
      </div>
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : d.id ? "Enregistrer" : "Créer l'évènement"}</button>
    </form>
  );
}

export function PollForm() {
  const [state, action, pending] = useActionState(createPoll, undefined);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label">Question</label>
        <input name="question" required maxLength={255} placeholder="Quel thème pour la soirée ?" className="input" />
      </div>
      <div>
        <label className="label">Options (une par ligne, 2 à 10)</label>
        <textarea name="options" required rows={4} placeholder={"Années 80\nCasino\nDéguisé"} className="input" />
      </div>
      <div className="max-w-xs">
        <label className="label">Clôture (facultatif)</label>
        <input name="closesAt" type="datetime-local" className="input" />
      </div>
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Création…" : "Créer le sondage"}</button>
    </form>
  );
}

export function IdeaForm() {
  const [state, action, pending] = useActionState(submitIdea, undefined);
  return (
    <form action={action} className="space-y-3">
      <textarea name="body" required rows={3} maxLength={1000} placeholder="Une sortie, une soirée, un projet, un achat pour le BDE…" aria-label="Ton idée" className="input" />
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Envoi…" : "Proposer l'idée"}</button>
    </form>
  );
}
