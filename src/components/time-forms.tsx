"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions";
import { saveTimeEntry, saveTimeSettings, setDayStatus } from "@/lib/time-actions";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

export function TimeEntryForm({
  today, id, day = today, endDay, start = "09:00", end = "17:00", pause = 60, comment = "",
}: { today: string; id?: number; day?: string; endDay?: string; start?: string; end?: string; pause?: number; comment?: string }) {
  const [state, action, pending] = useActionState(saveTimeEntry, undefined);
  const k = id ?? "new";
  return (
    <form action={action} className="flex flex-wrap items-end gap-3" key={id ? `e${id}` : state?.ok ? "done" : "new"}>
      {id && <input type="hidden" name="id" value={id} />}
      <div className="w-40"><label className="label" htmlFor={`td${k}`}>Date</label><input id={`td${k}`} name="day" type="date" defaultValue={day} max={today} required className="input" /></div>
      <div className="w-32"><label className="label" htmlFor={`ts${k}`}>Début</label><input id={`ts${k}`} name="start" type="time" defaultValue={start} required className="input" /></div>
      <div className="w-32"><label className="label" htmlFor={`te${k}`}>Fin</label><input id={`te${k}`} name="end" type="time" defaultValue={end} required className="input" /></div>
      <div className="w-40"><label className="label" htmlFor={`ted${k}`}>Date de fin</label><input id={`ted${k}`} name="endDay" type="date" defaultValue={endDay ?? day} max={today} required className="input" /></div>
      <div className="w-28"><label className="label" htmlFor={`tp${k}`}>Pause (min)</label><input id={`tp${k}`} name="pause" type="number" min={0} max={600} step={5} defaultValue={pause} className="input" /></div>
      <div className="min-w-48 flex-1"><label className="label" htmlFor={`tc${k}`}>Commentaire (facultatif)</label><input id={`tc${k}`} name="comment" defaultValue={comment} maxLength={300} placeholder="Astreinte, déplacement…" className="input" /></div>
      <button className="btn" disabled={pending}>{pending ? "…" : id ? "Enregistrer" : "Ajouter la ligne"}</button>
      <div className="basis-full"><Feedback state={state} /></div>
      <p className="basis-full text-xs text-muted">Si le travail finit après minuit, mets la date de fin au lendemain (ex. 21h → 3h du matin).</p>
    </form>
  );
}

export function DayStatusForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(setDayStatus, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="w-40"><label className="label" htmlFor="ds-day">Jour</label><input id="ds-day" name="day" type="date" defaultValue={today} max={today} required className="input" /></div>
      <div className="w-44">
        <label className="label" htmlFor="ds-kind">Marquer comme</label>
        <select id="ds-kind" name="kind" defaultValue="conge" className="input">
          <option value="conge">Congé</option>
          <option value="maladie">Maladie</option>
          <option value="vide">Retirer le marquage</option>
        </select>
      </div>
      <button className="btn-ghost" disabled={pending}>{pending ? "…" : "Appliquer"}</button>
      <div className="basis-full"><Feedback state={state} /></div>
    </form>
  );
}

export function TimeSettingsForm({ standardHours, tutorUserId, colleagues }: { standardHours: number; tutorUserId: number | null; colleagues: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState(saveTimeSettings, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="w-44">
        <label className="label" htmlFor="ts-standard">Journée standard</label>
        <input id="ts-standard" name="standardHours" type="number" min={1} max={16} step={0.25} defaultValue={standardHours} required className="input" />
        <p className="mt-1 text-xs text-muted">En heures (ex. 7). Sert à calculer les heures sup.</p>
      </div>
      <div className="min-w-56 flex-1">
        <label className="label" htmlFor="ts-tutor">Référent (tuteur, patron…)</label>
        <select id="ts-tutor" name="tutorUserId" defaultValue={tutorUserId ?? ""} className="input">
          <option value="">Personne</option>
          {colleagues.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <p className="mt-1 text-xs text-muted">Cette personne voit ta pointeuse et tes stats en lecture seule.</p>
      </div>
      <button className="btn" disabled={pending}>{pending ? "…" : "Enregistrer"}</button>
      <div className="basis-full"><Feedback state={state} /></div>
    </form>
  );
}
