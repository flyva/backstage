"use client";

import { useActionState, useRef, useState } from "react";
import { Camera, Images, Plus, Receipt, Trash2, X } from "lucide-react";
import type { FormState } from "@/lib/actions";
import { applyRhythm, removeLogFile, saveLog, setRange } from "@/lib/alternance-actions";
import { saveExpenseNote, saveRestoSettings } from "@/lib/expense-actions";
import { KIND_LABEL } from "@/lib/alternance";
import { MarkdownField } from "@/components/MarkdownField";
import { DateRangeField } from "@/components/DateRangeField";
import { AddressField } from "@/components/AddressField";
import { ConfirmButton } from "@/components/ConfirmButton";

// Les photos prises directement au téléphone pèsent souvent plusieurs Mo : les réduire dans le navigateur avant
// l'envoi (upload sinon très lent, surtout en 4G) sans attendre d'y revenir côté serveur.
async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  if (!/^image\/(jpeg|png)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) return file;
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file;
  }
}

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

let nextLogFileId = 0;
type LogPending = { id: number; file: File; previewUrl: string };

export function LogForm({
  today, id, day, endDay, place = "entreprise", title = "", mission = "", skills = "", existingPhotos = [],
}: {
  today: string; id?: number; day: string; endDay?: string; place?: string; title?: string; mission?: string; skills?: string;
  existingPhotos?: { id: number; url: string }[];
}) {
  const [state, action, pending] = useActionState(saveLog, undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<LogPending[]>([]);
  const k = id ?? "new";

  const addPhotos = async (list: FileList | null) => {
    if (!list) return;
    const incoming = await Promise.all([...list].map((file) => compressImage(file)));
    setPhotos((cur) => [...cur, ...incoming.map((file) => ({ id: nextLogFileId++, file, previewUrl: URL.createObjectURL(file) }))]);
  };
  const removePhoto = (pid: number) => setPhotos((cur) => {
    const hit = cur.find((p) => p.id === pid);
    if (hit) URL.revokeObjectURL(hit.previewUrl);
    return cur.filter((p) => p.id !== pid);
  });
  const onSubmit = () => {
    const dt = new DataTransfer();
    photos.forEach((p) => dt.items.add(p.file));
    if (inputRef.current) inputRef.current.files = dt.files;
  };

  return (
    <form action={action} onSubmit={onSubmit} className="space-y-3" key={id ? `e${id}` : state?.ok ? "done" : "new"}>
      {id && <input type="hidden" name="id" value={id} />}
      <div>
        <label className="label" htmlFor={`lt${k}`}>Titre (facultatif)</label>
        <input id={`lt${k}`} name="title" defaultValue={title} maxLength={150} placeholder="Ex. Montage du festival, maintenance parc son…" className="input" />
      </div>
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
        <MarkdownField name="mission" defaultValue={mission} rows={4} maxLength={5000} uploadUrl="/api/wiki/files" label="Missions réalisées" placeholder="Ce que tu as fait, appris, les difficultés…" />
      </div>
      <div>
        <label className="label" htmlFor={`ls${k}`}>Compétences travaillées</label>
        <input id={`ls${k}`} name="skills" defaultValue={skills} maxLength={300} placeholder="patch DMX, câblage, conduite (séparées par des virgules)" className="input" />
      </div>
      <div>
        <label className="label">Photos (à côté du texte, facultatif)</label>
        {(existingPhotos.length > 0 || photos.length > 0) && (
          <ul className="mb-2 flex flex-wrap gap-2">
            {existingPhotos.map((p) => (
              <li key={`e${p.id}`} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="size-20 rounded-lg border border-line object-cover" />
                <form action={removeLogFile} className="absolute -right-1.5 -top-1.5">
                  <input type="hidden" name="fileId" value={p.id} />
                  <ConfirmButton message="Retirer cette photo de l'entrée ?" className="grid size-5 place-items-center rounded-full bg-danger text-white shadow">
                    <Trash2 size={11} />
                  </ConfirmButton>
                </form>
              </li>
            ))}
            {photos.map((p) => (
              <li key={p.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.previewUrl} alt="" className="size-20 rounded-lg border border-line object-cover" />
                <button type="button" onClick={() => removePhoto(p.id)} aria-label="Retirer cette photo" className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-danger text-white shadow"><X size={12} /></button>
              </li>
            ))}
          </ul>
        )}
        <input ref={inputRef} name="photos" type="file" accept="image/jpeg,image/png" multiple hidden />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
        <input ref={galleryRef} type="file" accept="image/jpeg,image/png" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => cameraRef.current?.click()} className="btn-ghost text-sm"><Camera size={15} /> Prendre une photo</button>
          <button type="button" onClick={() => galleryRef.current?.click()} className="btn-ghost text-sm"><Images size={15} /> Choisir depuis la pellicule</button>
        </div>
      </div>
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : id ? "Enregistrer" : "Ajouter l'entrée"}</button>
    </form>
  );
}

let nextExpFileId = 0;
type ExpPending = { id: number; file: File; previewUrl: string };

/** Note de frais : une ou plusieurs photos du reçu, date/heure/lieu (auto-complété), prix. Le commentaire est généré côté serveur à l'enregistrement. */
export function ExpenseNoteForm({ today, now, day = today, moment = "midi" }: { today: string; now: string; day?: string; moment?: "midi" | "soir" }) {
  const [state, action, pending] = useActionState(saveExpenseNote, undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<ExpPending[]>([]);
  const [error, setError] = useState("");

  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    setError("");
    if (files.length + list.length > 10) { setError("10 photos maximum"); return; }
    const incoming = await Promise.all([...list].map((file) => compressImage(file)));
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
        <input ref={inputRef} name="photos" type="file" accept="image/jpeg,image/png" multiple hidden />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        <input ref={galleryRef} type="file" accept="image/jpeg,image/png" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
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
          <button type="button" onClick={() => cameraRef.current?.click()} className="btn-ghost text-sm"><Camera size={15} /> Prendre une photo</button>
          <button type="button" onClick={() => galleryRef.current?.click()} className="btn-ghost text-sm">
            {files.length === 0 ? <Images size={15} /> : <Plus size={15} />} Choisir depuis la pellicule
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-danger" role="alert">{error}</p>}
        <p className="mt-1 text-xs text-muted">Plusieurs photos possibles (plusieurs reçus pour une même dépense).</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="exp-date">Date</label><input id="exp-date" name="date" type="date" defaultValue={day} required className="input" /></div>
        <div>
          <label className="label" htmlFor="exp-moment">Moment</label>
          <select id="exp-moment" name="moment" defaultValue={moment} className="input">
            <option value="midi">Midi</option>
            <option value="soir">Soir</option>
          </select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
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

/** Plafonds de remboursement repas, propres à chaque personne (contrat différent selon l'entreprise) : jamais un réglage général. */
export function RestoSettingsForm({
  maxDay, maxMeal, tr, trMoment,
}: { maxDay: number | null; maxMeal: number | null; tr: number | null; trMoment: "midi" | "soir" | "les_deux" }) {
  const [state, action, pending] = useActionState(saveRestoSettings, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="rs-day">Plafond par jour (€)</label>
          <input id="rs-day" name="maxDay" type="number" min={0} max={1000} step={0.01} defaultValue={maxDay ?? ""} className="input" placeholder="Ex. 34" />
        </div>
        <div>
          <label className="label" htmlFor="rs-meal">Plafond par repas (€)</label>
          <input id="rs-meal" name="maxMeal" type="number" min={0} max={1000} step={0.01} defaultValue={maxMeal ?? ""} className="input" placeholder="Ex. 17" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="rs-tr">Titre-restaurant, part entreprise (€)</label>
          <input id="rs-tr" name="tr" type="number" min={0} max={1000} step={0.01} defaultValue={tr ?? ""} className="input" placeholder="Ex. 4,36" />
          <p className="mt-1 text-xs text-muted">Déduit du remboursement sur le(s) repas concerné(s), car déjà couvert par le ticket resto.</p>
        </div>
        <div>
          <label className="label" htmlFor="rs-moment">Ticket resto déduit sur</label>
          <select id="rs-moment" name="trMoment" defaultValue={trMoment} className="input">
            <option value="midi">Midi seulement</option>
            <option value="soir">Soir seulement</option>
            <option value="les_deux">Midi et soir</option>
          </select>
        </div>
      </div>
      <p className="text-xs text-muted">Laisse les plafonds vides pour désactiver le calcul automatique dans les notes de frais.</p>
      <div className="flex items-center gap-3">
        <button className="btn" disabled={pending}>{pending ? "…" : "Enregistrer"}</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
