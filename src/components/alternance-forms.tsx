"use client";

import { useActionState, useRef, useState } from "react";
import { Camera, Plus, Receipt, X } from "lucide-react";
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

let nextExpFileId = 0;
type ExpPending = { id: number; file: File; previewUrl: string };

/** Note de frais : une ou plusieurs photos du reçu, date/heure/lieu (auto-complété), prix. Le commentaire est généré côté serveur à l'enregistrement. */
export function ExpenseNoteForm({ today, now }: { today: string; now: string }) {
  const [state, action, pending] = useActionState(saveExpenseNote, undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<ExpPending[]>([]);
  const [error, setError] = useState("");

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setError("");
    const incoming = [...list];
    if (files.length + incoming.length > 10) { setError("10 photos maximum"); return; }
    setFiles((cur) => [...cur, ...incoming.map((file) => ({ id: nextExpFileId++, file, previewUrl: URL.createObjectURL(file) }))]);
  };
  const removeFile = (id: number) => setFiles((cur) => {
    const hit = cur.find((f) => f.id === id);
    if (hit) URL.revokeObjectURL(hit.previewUrl);
    return cur.filter((f) => f.id !== id);
  });
  // Juste avant l'envoi : reconstruit le FileList du vrai champ à partir des photos accumulées (chaque sélection
  // via la caméra ou la pellicule les ajoute une à une, un <input> natif ne garde sinon que la dernière sélection).
  const onSubmit = () => {
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f.file));
    if (inputRef.current) inputRef.current.files = dt.files;
  };

  return (
    <form action={action} onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label">Photos du reçu</label>
        <input
          ref={inputRef} name="photos" type="file" accept="image/jpeg,image/png" multiple hidden
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
        />
        {files.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-2">
            {files.map((f) => (
              <li key={f.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.previewUrl} alt="" className="size-20 rounded-lg border border-line object-cover" />
                <button type="button" onClick={() => removeFile(f.id)} aria-label="Retirer cette photo" className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-danger text-white shadow"><X size={12} /></button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} className="btn-ghost text-sm">
            {files.length === 0 ? <Camera size={15} /> : <Plus size={15} />} {files.length === 0 ? "Prendre ou choisir une photo" : "Ajouter une autre photo"}
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-danger" role="alert">{error}</p>}
        <p className="mt-1 text-xs text-muted">Sur téléphone : prendre une photo ou en choisir depuis la pellicule. Plusieurs photos possibles (plusieurs reçus pour une même dépense).</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="label" htmlFor="exp-date">Date</label><input id="exp-date" name="date" type="date" defaultValue={today} required className="input" /></div>
        <div><label className="label" htmlFor="exp-time">Heure</label><input id="exp-time" name="time" type="time" defaultValue={now} required className="input" /></div>
        <div><label className="label" htmlFor="exp-price">Prix (€)</label><input id="exp-price" name="price" type="number" step="0.01" min="0.01" required className="input" placeholder="12,50" /></div>
      </div>
      <div><label className="label" htmlFor="exp-name">Nom du lieu</label><input id="exp-name" name="placeName" required maxLength={120} className="input" placeholder="Ex. Décathlon, restaurant Chez Mimi…" /></div>
      <AddressField id="exp-place" name="place" label="Adresse" placeholder="Adresse du lieu" />
      <div><label className="label" htmlFor="exp-comment">Commentaire (facultatif)</label><textarea id="exp-comment" name="comment" rows={2} maxLength={500} className="input" placeholder="Précision à ajouter au commentaire généré" /></div>
      <Feedback state={state} />
      <button className="btn" disabled={pending || files.length === 0}><Receipt size={15} /> {pending ? "Enregistrement…" : "Enregistrer la note de frais"}</button>
    </form>
  );
}
