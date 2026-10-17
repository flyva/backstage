"use client";

import { useActionState } from "react";
import { Receipt } from "lucide-react";
import type { FormState } from "@/lib/actions";
import { applyRhythm, saveLog, setRange } from "@/lib/alternance-actions";
import { saveExpenseNote } from "@/lib/expense-actions";
import { KIND_LABEL } from "@/lib/alternance";
import { MarkdownField } from "@/components/MarkdownField";
import { DateRangeField } from "@/components/DateRangeField";
import { AddressField } from "@/components/AddressField";

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

export function LogForm({ today, id, day, endDay, place = "entreprise", mission = "", skills = "" }: { today: string; id?: number; day: string; endDay?: string; place?: string; mission?: string; skills?: string }) {
  const [state, action, pending] = useActionState(saveLog, undefined);
  const k = id ?? "new";
  return (
    <form action={action} className="space-y-3" key={id ? `e${id}` : state?.ok ? "done" : "new"}>
      {id && <input type="hidden" name="id" value={id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`ld${k}`}>Date</label>
          <DateRangeField id={`ld${k}`} today={today} day={day} endDay={endDay ?? day} hint="Clique un jour, ou un autre jour pour une période (ex. une semaine de montage)." />
        </div>
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

/** Note de frais : photo du reçu, date/heure/lieu (auto-complété), prix. Le commentaire est généré côté serveur à l'enregistrement. */
export function ExpenseNoteForm({ today, now }: { today: string; now: string }) {
  const [state, action, pending] = useActionState(saveExpenseNote, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="exp-photo">Photo du reçu</label>
        <input id="exp-photo" name="photo" type="file" accept="image/jpeg,image/png" capture="environment" required className="input" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="label" htmlFor="exp-date">Date</label><input id="exp-date" name="date" type="date" defaultValue={today} required className="input" /></div>
        <div><label className="label" htmlFor="exp-time">Heure</label><input id="exp-time" name="time" type="time" defaultValue={now} required className="input" /></div>
        <div><label className="label" htmlFor="exp-price">Prix (€)</label><input id="exp-price" name="price" type="number" step="0.01" min="0.01" required className="input" placeholder="12,50" /></div>
      </div>
      <AddressField id="exp-place" name="place" label="Lieu" placeholder="Nom et adresse du lieu" />
      <Feedback state={state} />
      <button className="btn" disabled={pending}><Receipt size={15} /> {pending ? "Enregistrement…" : "Enregistrer la note de frais"}</button>
    </form>
  );
}
