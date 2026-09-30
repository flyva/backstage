"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { ImagePlus, X } from "lucide-react";
import type { FormState } from "@/lib/actions";
import { copyTech, lightToLibrary, saveFixture, saveMemory } from "@/lib/library-actions";
import { MarkdownField } from "@/components/MarkdownField";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

export function FixtureForm({ id, name = "", mode = "", footprint = 1, watts = "", notes = "" }: { id?: number; name?: string; mode?: string; footprint?: number; watts?: number | string; notes?: string }) {
  const [state, action, pending] = useActionState(saveFixture, undefined);
  const k = id ?? "new";
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-6" key={id ? `e${id}` : state?.ok ? "done" : "new"}>
      {id && <input type="hidden" name="id" value={id} />}
      <div className="sm:col-span-3"><label className="label" htmlFor={`fn${k}`}>Appareil</label><input id={`fn${k}`} name="name" defaultValue={name} required maxLength={120} placeholder="PAR LED 18x10W" className="input" /></div>
      <div className="sm:col-span-3"><label className="label" htmlFor={`fm${k}`}>Mode DMX</label><input id={`fm${k}`} name="mode" defaultValue={mode} maxLength={60} placeholder="8 canaux" className="input" /></div>
      <div className="sm:col-span-2"><label className="label" htmlFor={`ff${k}`}>Nb canaux</label><input id={`ff${k}`} name="footprint" type="number" min={1} max={512} defaultValue={footprint} className="input" /></div>
      <div className="sm:col-span-2"><label className="label" htmlFor={`fw${k}`}>Puissance (W)</label><input id={`fw${k}`} name="watts" type="number" min={0} max={100000} defaultValue={watts} placeholder="180" className="input" /></div>
      <div className="sm:col-span-6"><label className="label" htmlFor={`fo${k}`}>Notes</label><input id={`fo${k}`} name="notes" defaultValue={notes} maxLength={300} className="input" /></div>
      <div className="space-y-2 sm:col-span-6">
        <Feedback state={state} />
        <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : id ? "Enregistrer" : "Ajouter à la bibliothèque"}</button>
      </div>
    </form>
  );
}

export function MemoryForm({ id, title = "", console: consoleName = "", number = "", category = "", notes = "", tags = "", image = "", consoles }: { id?: number; title?: string; console?: string; number?: string; category?: string; notes?: string; tags?: string; image?: string; consoles: string[] }) {
  const [state, action, pending] = useActionState(saveMemory, undefined);
  const [img, setImg] = useState(image ? `/api/wiki/files/${image}` : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const k = id ?? "new";

  const upload = async (file: File) => {
    setBusy(true);
    setErr(null);
    const fd = new FormData();
    fd.set("file", file);
    try {
      const res = await fetch("/api/wiki/files", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string; image?: boolean };
      if (!res.ok || !data.url) setErr(data.error ?? "Envoi impossible");
      else if (!data.image) setErr("Ce fichier n'est pas une image");
      else setImg(data.url);
    } catch {
      setErr("Envoi impossible");
    } finally {
      setBusy(false);
      if (picker.current) picker.current.value = "";
    }
  };

  return (
    <form action={action} className="space-y-3" key={id ? `e${id}` : state?.ok ? "done" : "new"}>
      {id && <input type="hidden" name="id" value={id} />}
      <input type="hidden" name="image" value={img} />
      <div className="grid gap-3 sm:grid-cols-6">
        <div className="sm:col-span-4"><label className="label" htmlFor={`mt${k}`}>Titre</label><input id={`mt${k}`} name="title" defaultValue={title} required maxLength={150} placeholder="Ambiance bleue lente" className="input" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor={`mn${k}`}>N° de mémoire / cue</label><input id={`mn${k}`} name="number" defaultValue={number} maxLength={30} placeholder="12.5" className="input" /></div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor={`mc${k}`}>Console</label>
          <input id={`mc${k}`} name="console" defaultValue={consoleName} maxLength={80} list="mem-consoles" placeholder="grandMA3" className="input" />
          <datalist id="mem-consoles">{consoles.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div className="sm:col-span-2"><label className="label" htmlFor={`mg${k}`}>Catégorie</label><input id={`mg${k}`} name="category" defaultValue={category} maxLength={60} placeholder="Ambiance, effet, blackout…" className="input" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor={`mtags${k}`}>Étiquettes</label><input id={`mtags${k}`} name="tags" defaultValue={tags} maxLength={200} placeholder="théâtre, concert" className="input" /></div>
      </div>
      <div>
        <label className="label">Détails (fixtures, valeurs, temps, astuces)</label>
        <MarkdownField name="notes" defaultValue={notes} rows={5} maxLength={10000} label="Détails de la mémoire" />
      </div>
      <div className="space-y-2">
        <label className="label">Capture d&apos;écran (facultatif)</label>
        {img ? (
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt="" className="max-h-40 rounded-lg border border-line" />
            <button type="button" onClick={() => setImg("")} className="rounded-lg p-1 text-muted hover:text-danger" aria-label="Retirer la capture"><X size={16} /></button>
          </div>
        ) : (
          <button type="button" className="btn-ghost text-sm" disabled={busy} onClick={() => picker.current?.click()}><ImagePlus size={16} /> {busy ? "Envoi…" : "Ajouter une image"}</button>
        )}
        <input ref={picker} type="file" hidden accept="image/jpeg,image/png,image/gif,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
        {err && <p className="text-xs text-danger" role="alert">{err}</p>}
      </div>
      <Feedback state={state} />
      <button className="btn" disabled={pending || busy}>{pending ? "Enregistrement…" : id ? "Enregistrer" : "Ajouter la mémoire"}</button>
    </form>
  );
}

/** Formulaire de copie du patch lumière / des entrées son d'un autre projet. */
export function CopyTechForm({ projectId, sources }: { projectId: number; sources: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState(copyTech, undefined);
  if (sources.length === 0) return <p className="text-sm text-muted">Tu n&apos;as pas d&apos;autre projet dont copier les fiches.</p>;
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="min-w-56 flex-1">
        <label className="label" htmlFor="copy-src">Copier depuis</label>
        <select id="copy-src" name="sourceId" className="input" defaultValue={sources[0].id}>{sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      </div>
      <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="lights" defaultChecked className="size-4 accent-[var(--accent)]" /> Patch lumière</label>
      <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="inputs" defaultChecked className="size-4 accent-[var(--accent)]" /> Entrées son</label>
      <button className="btn" disabled={pending}>{pending ? "Copie…" : "Copier"}</button>
      <div className="basis-full"><Feedback state={state} /></div>
    </form>
  );
}

/** Bouton « Ajouter à la bibliothèque » d'un projecteur de la fiche. */
export function LightToLibraryButton({ lightId }: { lightId: number }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        className="btn-ghost text-xs"
        disabled={pending}
        onClick={() => start(async () => { const r = await lightToLibrary(lightId); setMsg(r?.error ?? r?.ok ?? null); })}
      >
        Ajouter à la bibliothèque
      </button>
      {msg && <span className="text-xs text-muted" role="status">{msg}</span>}
    </span>
  );
}
