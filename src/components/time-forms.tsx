"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions";
import type { WorkKind } from "@/db/schema";
import { saveTimeEntry, saveTimeSettings, setDayStatus } from "@/lib/time-actions";
import { DateRangeField } from "@/components/DateRangeField";

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
      <div className="w-56"><label className="label" htmlFor={`td${k}`}>Jour(s)</label><DateRangeField id={`td${k}`} today={today} day={day} endDay={endDay ?? day} maxSpanDays={1} hint="Clique un jour, puis le lendemain si ça passe minuit." /></div>
      <div className="w-32"><label className="label" htmlFor={`ts${k}`}>Début</label><input id={`ts${k}`} name="start" type="time" defaultValue={start} required className="input" /></div>
      <div className="w-32"><label className="label" htmlFor={`te${k}`}>Fin</label><input id={`te${k}`} name="end" type="time" defaultValue={end} required className="input" /></div>
      <div className="w-28"><label className="label" htmlFor={`tp${k}`}>Pause (min)</label><input id={`tp${k}`} name="pause" type="number" min={0} max={600} step={5} defaultValue={pause} className="input" /></div>
      <div className="min-w-48 flex-1"><label className="label" htmlFor={`tc${k}`}>Commentaire (facultatif)</label><input id={`tc${k}`} name="comment" defaultValue={comment} maxLength={300} placeholder="Astreinte, déplacement…" className="input" /></div>
      <button className="btn" disabled={pending}>{pending ? "…" : id ? "Enregistrer" : "Ajouter la ligne"}</button>
      <div className="basis-full"><Feedback state={state} /></div>
      <p className="basis-full text-xs text-muted">Choisis un seul jour, ou deux jours qui se suivent si le travail finit après minuit (ex. 21h → 3h du matin).</p>
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

/** Ligne de tableau : change le statut (congé ↔ maladie) d'un jour déjà marqué, sans repasser par le formulaire du haut. */
export function DayStatusEditForm({ day, kind }: { day: string; kind: Extract<WorkKind, "conge" | "maladie"> }) {
  const [state, action, pending] = useActionState(setDayStatus, undefined);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="day" value={day} />
      <select name="kind" defaultValue={kind} disabled={pending} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="input py-1 text-xs">
        <option value="conge">Congé</option>
        <option value="maladie">Maladie</option>
      </select>
      {state?.error && <span className="text-xs text-danger">{state.error}</span>}
    </form>
  );
}

export function TimeSettingsForm({ standardHours, workDaysPerWeek, viewerIds, colleagues }: { standardHours: number; workDaysPerWeek: number; viewerIds: number[]; colleagues: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState(saveTimeSettings, undefined);
  const restDays = 7 - workDaysPerWeek;
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="ts-standard">Journée standard</label>
          <input id="ts-standard" name="standardHours" type="number" min={1} max={16} step={0.25} defaultValue={standardHours} required className="input" />
          <p className="mt-1 text-xs text-muted">En heures (ex. 7). Sert à calculer les heures sup.</p>
        </div>
        <div>
          <label className="label" htmlFor="ts-weekdays">Jours travaillés / semaine</label>
          <select id="ts-weekdays" name="workDaysPerWeek" defaultValue={workDaysPerWeek} className="input">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n} jour{n > 1 ? "s" : ""}</option>)}
          </select>
          <p className="mt-1 text-xs text-muted">Les heures sup se comptent sur la semaine entière. Les {restDays > 0 ? `${restDays} dernier${restDays > 1 ? "s" : ""} jour${restDays > 1 ? "s" : ""} de la semaine (ex. week-end)` : "jours restants"} sont marqués « Repos » tout seuls.</p>
        </div>
        <div>
          <label className="label" htmlFor="ts-tutor">Référents (tuteur, patron, entreprise d&apos;accueil…)</label>
          <select id="ts-tutor" name="viewerIds" multiple size={Math.min(5, Math.max(3, colleagues.length))} defaultValue={viewerIds.map(String)} className="input">
            {colleagues.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <p className="mt-1 text-xs text-muted">Ces personnes voient ton planning, ta pointeuse et tes stats en lecture seule (ctrl/cmd + clic pour en choisir plusieurs).</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn" disabled={pending}>{pending ? "…" : "Enregistrer"}</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
