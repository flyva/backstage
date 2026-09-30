"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions";
import { applyRhythm, saveLog, setRange } from "@/lib/alternance-actions";
import { KIND_LABEL } from "@/lib/alternance";
import { MarkdownField } from "@/components/MarkdownField";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

export function RangeForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(setRange, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div><label className="label" htmlFor="rg-from">Du</label><input id="rg-from" name="from" type="date" defaultValue={today} required className="input" /></div>
      <div><label className="label" htmlFor="rg-to">Au</label><input id="rg-to" name="to" type="date" defaultValue={today} required className="input" /></div>
      <div>
        <label className="label" htmlFor="rg-kind">Type</label>
        <select id="rg-kind" name="kind" defaultValue="entreprise" className="input">
          {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          <option value="vide">Effacer</option>
        </select>
      </div>
      <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="weekdaysOnly" defaultChecked className="size-4 accent-[var(--accent)]" /> Lundi au vendredi seulement</label>
      <div className="space-y-2 sm:col-span-2 lg:col-span-4">
        <Feedback state={state} />
        <button className="btn" disabled={pending}>{pending ? "…" : "Appliquer à la période"}</button>
      </div>
    </form>
  );
}

export function RhythmForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(applyRhythm, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div><label className="label" htmlFor="rh-start">Premier lundi</label><input id="rh-start" name="start" type="date" defaultValue={today} required className="input" /></div>
      <div><label className="label" htmlFor="rh-school">Semaines à l&apos;école</label><input id="rh-school" name="schoolWeeks" type="number" min={0} max={26} defaultValue={1} required className="input" /></div>
      <div><label className="label" htmlFor="rh-company">Semaines en entreprise</label><input id="rh-company" name="companyWeeks" type="number" min={0} max={52} defaultValue={3} required className="input" /></div>
      <div><label className="label" htmlFor="rh-cycles">Répéter</label><input id="rh-cycles" name="cycles" type="number" min={1} max={30} defaultValue={8} required className="input" /></div>
      <div className="space-y-2 sm:col-span-2 lg:col-span-4">
        <Feedback state={state} />
        <button className="btn" disabled={pending}>{pending ? "…" : "Planifier le rythme"}</button>
      </div>
    </form>
  );
}

export function LogForm({ id, day, hours = "7h", place = "entreprise", mission = "", skills = "" }: { id?: number; day: string; hours?: string; place?: string; mission?: string; skills?: string }) {
  const [state, action, pending] = useActionState(saveLog, undefined);
  const k = id ?? "new";
  return (
    <form action={action} className="space-y-3" key={id ? `e${id}` : state?.ok ? "done" : "new"}>
      {id && <input type="hidden" name="id" value={id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="label" htmlFor={`ld${k}`}>Date</label><input id={`ld${k}`} name="day" type="date" defaultValue={day} required className="input" /></div>
        <div><label className="label" htmlFor={`lh${k}`}>Durée</label><input id={`lh${k}`} name="hours" defaultValue={hours} required placeholder="7h30" className="input" /></div>
        <div>
          <label className="label" htmlFor={`lp${k}`}>Lieu</label>
          <select id={`lp${k}`} name="place" defaultValue={place} className="input"><option value="entreprise">Entreprise</option><option value="ecole">École</option></select>
        </div>
      </div>
      <div>
        <label className="label">Missions réalisées</label>
        <MarkdownField name="mission" defaultValue={mission} rows={4} maxLength={5000} label="Missions réalisées" placeholder="Ce que tu as fait, appris, les difficultés…" />
      </div>
      <div>
        <label className="label" htmlFor={`ls${k}`}>Compétences travaillées</label>
        <input id={`ls${k}`} name="skills" defaultValue={skills} maxLength={300} placeholder="patch DMX, câblage, conduite (séparées par des virgules)" className="input" />
      </div>
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : id ? "Enregistrer" : "Ajouter l'entrée"}</button>
    </form>
  );
}
