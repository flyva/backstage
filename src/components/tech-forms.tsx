"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import type { FormState } from "@/lib/actions";
import { addInput, addLight, importLights, updateInput, updateLight } from "@/lib/tech-actions";
import { parseCsv } from "@/lib/csv";
import { mapLightCsv } from "@/lib/tech";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

type LightDefaults = {
  id?: number; channel?: number | null; label?: string; mode?: string | null; universe?: number; address?: number | null;
  footprint?: number; position?: string | null; color?: string | null; notes?: string | null;
};

function LightFields({ d }: { d: LightDefaults }) {
  return (
    <div className="grid gap-2 sm:grid-cols-6">
      <div><label className="label">Circuit</label><input name="channel" type="number" min={0} defaultValue={d.channel ?? ""} className="input" /></div>
      <div className="sm:col-span-3"><label className="label">Projecteur</label><input name="label" required maxLength={120} defaultValue={d.label} placeholder="PAR LED 18x10W" className="input" /></div>
      <div className="sm:col-span-2"><label className="label">Mode DMX</label><input name="mode" maxLength={60} defaultValue={d.mode ?? ""} placeholder="8 canaux" className="input" /></div>
      <div><label className="label">Univers</label><input name="universe" type="number" min={1} max={999} defaultValue={d.universe ?? 1} className="input" /></div>
      <div><label className="label">Adresse</label><input name="address" type="number" min={1} max={512} defaultValue={d.address ?? ""} placeholder="1–512" className="input" /></div>
      <div><label className="label">Nb canaux</label><input name="footprint" type="number" min={1} max={512} defaultValue={d.footprint ?? 1} className="input" /></div>
      <div className="sm:col-span-3"><label className="label">Position</label><input name="position" maxLength={100} defaultValue={d.position ?? ""} placeholder="Contre 1, perche 2…" className="input" /></div>
      <div><label className="label">Gélatine</label><input name="color" maxLength={60} defaultValue={d.color ?? ""} placeholder="L201" className="input" /></div>
      <div className="sm:col-span-6"><label className="label">Notes</label><input name="notes" maxLength={300} defaultValue={d.notes ?? ""} className="input" /></div>
    </div>
  );
}

export function AddLightForm({ projectId }: { projectId: number }) {
  const [state, action, pending] = useActionState(addLight, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      <LightFields d={{}} />
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Ajout…" : "Ajouter le projecteur"}</button>
    </form>
  );
}

export function EditLightForm({ light }: { light: LightDefaults & { id: number } }) {
  const [state, action, pending] = useActionState(updateLight, undefined);
  return (
    <form action={action} className="space-y-3 pt-2">
      <input type="hidden" name="lightId" value={light.id} />
      <LightFields d={light} />
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "…" : "Enregistrer"}</button>
    </form>
  );
}

type InputDefaults = { id?: number; channel?: number; source?: string; mic?: string | null; stand?: string | null; phantom?: boolean; notes?: string | null };

function InputFields({ d }: { d: InputDefaults }) {
  return (
    <div className="grid gap-2 sm:grid-cols-6">
      <div><label className="label">Canal</label><input name="channel" type="number" min={1} max={999} required defaultValue={d.channel} className="input" /></div>
      <div className="sm:col-span-2"><label className="label">Source</label><input name="source" required maxLength={100} defaultValue={d.source} placeholder="Grosse caisse" className="input" /></div>
      <div className="sm:col-span-2"><label className="label">Micro / DI</label><input name="mic" maxLength={100} defaultValue={d.mic ?? ""} placeholder="Beta 52" className="input" /></div>
      <div><label className="label">Pied</label><input name="stand" maxLength={60} defaultValue={d.stand ?? ""} placeholder="petit" className="input" /></div>
      <div className="sm:col-span-5"><label className="label">Notes</label><input name="notes" maxLength={300} defaultValue={d.notes ?? ""} className="input" /></div>
      <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="phantom" defaultChecked={d.phantom} className="size-4 accent-[var(--accent)]" /> +48 V</label>
    </div>
  );
}

export function AddInputForm({ projectId, nextChannel }: { projectId: number; nextChannel: number }) {
  const [state, action, pending] = useActionState(addInput, undefined);
  return (
    <form action={action} className="space-y-3" key={nextChannel}>
      <input type="hidden" name="projectId" value={projectId} />
      <InputFields d={{ channel: nextChannel }} />
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Ajout…" : "Ajouter l'entrée"}</button>
    </form>
  );
}

export function EditInputForm({ input }: { input: InputDefaults & { id: number } }) {
  const [state, action, pending] = useActionState(updateInput, undefined);
  return (
    <form action={action} className="space-y-3 pt-2">
      <input type="hidden" name="inputId" value={input.id} />
      <InputFields d={input} />
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "…" : "Enregistrer"}</button>
    </form>
  );
}

// Import CSV : le fichier est lu dans le navigateur, on montre ce qui sera reconnu, puis le serveur refait l'analyse.
export function ImportLightsForm({ projectId }: { projectId: number }) {
  const [state, action, pending] = useActionState(importLights, undefined);
  const [csv, setCsv] = useState("");
  const [name, setName] = useState("");
  const preview = csv ? mapLightCsv(parseCsv(csv)) : null;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="csv" value={csv} />
      <div>
        <label className="label" htmlFor="csvfile">Fichier CSV (export de console, Excel…)</label>
        <input
          id="csvfile"
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          className="input"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            setName(f?.name ?? "");
            setCsv(f && f.size < 2_000_000 ? await f.text() : "");
          }}
        />
      </div>
      {preview && (
        <div className="rounded-lg border border-line bg-bg p-3 text-xs">
          <p className="font-medium">{name} : {preview.lights.length} projecteur(s) reconnu(s){preview.skipped > 0 && `, ${preview.skipped} ligne(s) sans nom ignorée(s)`}</p>
          {preview.recognized.length > 0 && <p className="mt-1 text-muted">Colonnes reconnues : {preview.recognized.join(" · ")}</p>}
          {preview.ignored.length > 0 && <p className="text-muted">Colonnes ignorées : {preview.ignored.join(", ")}</p>}
          {preview.warnings.map((w) => <p key={w} className="text-danger">{w}</p>)}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="radio" name="mode" value="append" defaultChecked /> Ajouter au patch existant</label>
        <label className="flex items-center gap-2"><input type="radio" name="mode" value="replace" /> Remplacer tout le patch</label>
      </div>
      <Feedback state={state} />
      <button className="btn" disabled={pending || !preview || preview.lights.length === 0}>{pending ? "Import…" : "Importer"}</button>
    </form>
  );
}

export function FileUploader({ projectId }: { projectId: number }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(files: File[]) {
    setBusy(true);
    const results: string[] = [];
    for (const file of files) {
      const fd = new FormData();
      fd.set("file", file);
      try {
        const res = await fetch(`/api/projects/${projectId}/files`, { method: "POST", body: fd });
        const body = await res.json().catch(() => ({}));
        results.push(res.ok ? `✓ ${file.name}` : `✗ ${file.name} : ${body.error ?? `erreur ${res.status}`}`);
      } catch {
        results.push(`✗ ${file.name} : réseau indisponible`);
      }
    }
    setStatus(results.join("\n"));
    setBusy(false);
    if (input.current) input.current.value = "";
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <label className={`btn w-fit cursor-pointer ${busy ? "pointer-events-none opacity-50" : ""}`}>
        <Upload size={16} /> {busy ? "Envoi…" : "Ajouter un fichier"}
        <input ref={input} type="file" multiple accept="application/pdf,image/jpeg,image/png" className="sr-only" disabled={busy} onChange={(e) => e.target.files?.length && void upload([...e.target.files])} />
      </label>
      {status && <p className="whitespace-pre-line text-xs" aria-live="polite">{status}</p>}
      <p className="text-xs text-muted">PDF, JPEG ou PNG · 15 Mo max par fichier.</p>
    </div>
  );
}
