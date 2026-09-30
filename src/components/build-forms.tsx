"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions";
import { saveCircuit, saveItem, saveSlot } from "@/lib/build-actions";
import { TagPicker } from "@/components/TagPicker";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

type Member = { id: number; name: string };

export function SlotForm({
  projectId, members, id, day, startTime = "09:00", endTime = "10:00", title = "", notes = "", assigneeIds = [],
}: {
  projectId: number; members: Member[]; id?: number; day: string; startTime?: string; endTime?: string; title?: string; notes?: string; assigneeIds?: number[];
}) {
  const [state, action, pending] = useActionState(saveSlot, undefined);
  const k = id ?? "new";
  return (
    <form action={action} className="space-y-3" key={id ? `e${id}` : state?.ok ? "done" : "new"}>
      <input type="hidden" name="projectId" value={projectId} />
      {id && <input type="hidden" name="id" value={id} />}
      <div className="grid gap-3 sm:grid-cols-6">
        <div className="sm:col-span-2"><label className="label" htmlFor={`sd${k}`}>Jour</label><input id={`sd${k}`} name="day" type="date" defaultValue={day} required className="input" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor={`ss${k}`}>Début</label><input id={`ss${k}`} name="startTime" type="time" defaultValue={startTime} required className="input" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor={`se${k}`}>Fin</label><input id={`se${k}`} name="endTime" type="time" defaultValue={endTime} required className="input" /></div>
        <div className="sm:col-span-6"><label className="label" htmlFor={`st${k}`}>Tâche</label><input id={`st${k}`} name="title" defaultValue={title} required maxLength={200} placeholder="Accroche des projecteurs sur la perche 2" className="input" /></div>
        <div className="sm:col-span-6">
          <label className="label" htmlFor={`sa${k}`}>Qui ?</label>
          <TagPicker id={`sa${k}`} name="assigneeIds" options={members.map((m) => ({ value: m.id, label: m.name }))} defaultValue={assigneeIds} placeholder="Tape un nom…" />
        </div>
        <div className="sm:col-span-6"><label className="label" htmlFor={`sn${k}`}>Notes</label><input id={`sn${k}`} name="notes" defaultValue={notes} maxLength={500} className="input" /></div>
      </div>
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : id ? "Enregistrer" : "Ajouter le créneau"}</button>
    </form>
  );
}

export function CircuitForm({ projectId, id, name = "", breakerAmps = 16, phase = 1 }: { projectId: number; id?: number; name?: string; breakerAmps?: number; phase?: number }) {
  const [state, action, pending] = useActionState(saveCircuit, undefined);
  const k = id ?? "new";
  return (
    <form action={action} className="flex flex-wrap items-end gap-3" key={id ? `e${id}` : state?.ok ? "done" : "new"}>
      <input type="hidden" name="projectId" value={projectId} />
      {id && <input type="hidden" name="id" value={id} />}
      <div className="min-w-40 flex-1"><label className="label" htmlFor={`cn${k}`}>Circuit</label><input id={`cn${k}`} name="name" defaultValue={name} required maxLength={60} placeholder="Gradateur 1, Prise plateau…" className="input" /></div>
      <div className="w-28"><label className="label" htmlFor={`ca${k}`}>Calibre (A)</label><input id={`ca${k}`} name="breakerAmps" type="number" min={2} max={125} defaultValue={breakerAmps} className="input" /></div>
      <div className="w-32">
        <label className="label" htmlFor={`cp${k}`}>Phase</label>
        <select id={`cp${k}`} name="phase" defaultValue={phase} className="input"><option value={1}>L1</option><option value={2}>L2</option><option value={3}>L3</option></select>
      </div>
      <button className="btn" disabled={pending}>{pending ? "…" : id ? "Enregistrer" : "Ajouter"}</button>
      <div className="basis-full"><Feedback state={state} /></div>
    </form>
  );
}

export function ItemForm({ projectId, circuits, id, name = "", watts = "", qty = 1, circuitId = null }: { projectId: number; circuits: { id: number; name: string }[]; id?: number; name?: string; watts?: number | string; qty?: number; circuitId?: number | null }) {
  const [state, action, pending] = useActionState(saveItem, undefined);
  const k = id ?? "new";
  return (
    <form action={action} className="flex flex-wrap items-end gap-3" key={id ? `e${id}` : state?.ok ? "done" : "new"}>
      <input type="hidden" name="projectId" value={projectId} />
      {id && <input type="hidden" name="id" value={id} />}
      <div className="min-w-40 flex-1"><label className="label" htmlFor={`in${k}`}>Appareil</label><input id={`in${k}`} name="name" defaultValue={name} required maxLength={120} placeholder="PAR LED 18x10W" className="input" /></div>
      <div className="w-28"><label className="label" htmlFor={`iw${k}`}>Watts</label><input id={`iw${k}`} name="watts" type="number" min={0} max={100000} required defaultValue={watts} className="input" /></div>
      <div className="w-24"><label className="label" htmlFor={`iq${k}`}>Quantité</label><input id={`iq${k}`} name="qty" type="number" min={1} max={999} defaultValue={qty} className="input" /></div>
      <div className="min-w-40">
        <label className="label" htmlFor={`ic${k}`}>Circuit</label>
        <select id={`ic${k}`} name="circuitId" defaultValue={circuitId ?? ""} className="input"><option value="">Non affecté</option>{circuits.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </div>
      <button className="btn" disabled={pending}>{pending ? "…" : id ? "Enregistrer" : "Ajouter"}</button>
      <div className="basis-full"><Feedback state={state} /></div>
    </form>
  );
}
