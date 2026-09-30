"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions";
import { renameWikiCategory, saveFaq, saveLink, saveTemplate } from "@/lib/config-actions";
import { MarkdownField } from "@/components/MarkdownField";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

export function TemplateForm({ id, title = "", items = "" }: { id?: number; title?: string; items?: string }) {
  const [state, action, pending] = useActionState(saveTemplate, undefined);
  const k = id ?? "new";
  return (
    // key : après l'ajout d'un modèle, le formulaire se vide.
    <form action={action} className="space-y-3" key={id ? `e${id}` : state?.ok ? "done" : "new"}>
      {id && <input type="hidden" name="id" value={id} />}
      <div>
        <label className="label" htmlFor={`tt${k}`}>Titre du modèle</label>
        <input id={`tt${k}`} name="title" defaultValue={title} required maxLength={150} placeholder="Ex. Préparation concert" className="input" />
      </div>
      <div>
        <label className="label" htmlFor={`ti${k}`}>Éléments (un par ligne)</label>
        <textarea id={`ti${k}`} name="items" defaultValue={items} required rows={8} placeholder={"Vérifier les câbles\nTester les micros\n…"} className="input" />
      </div>
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : id ? "Enregistrer" : "Ajouter le modèle"}</button>
    </form>
  );
}

export function FaqForm({ id, category = "Général", question = "", answer = "", categories }: { id?: number; category?: string; question?: string; answer?: string; categories: string[] }) {
  const [state, action, pending] = useActionState(saveFaq, undefined);
  const k = id ?? "new";
  return (
    <form action={action} className="space-y-3" key={id ? `e${id}` : state?.ok ? "done" : "new"}>
      {id && <input type="hidden" name="id" value={id} />}
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
        <div>
          <label className="label" htmlFor={`fc${k}`}>Catégorie</label>
          <input id={`fc${k}`} name="category" defaultValue={category} required maxLength={80} list="faq-cats" className="input" />
          <datalist id="faq-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div>
          <label className="label" htmlFor={`fq${k}`}>Question</label>
          <input id={`fq${k}`} name="question" defaultValue={question} required minLength={3} maxLength={255} className="input" />
        </div>
      </div>
      <div>
        <label className="label">Réponse</label>
        <MarkdownField name="answer" defaultValue={answer} rows={6} maxLength={20000} label="Réponse" />
      </div>
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : id ? "Enregistrer" : "Ajouter la question"}</button>
    </form>
  );
}

export function LinkForm({ id, category = "École", label = "", url = "", description = "", categories }: { id?: number; category?: string; label?: string; url?: string; description?: string; categories: string[] }) {
  const [state, action, pending] = useActionState(saveLink, undefined);
  const k = id ?? "new";
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2" key={id ? `e${id}` : state?.ok ? "done" : "new"}>
      {id && <input type="hidden" name="id" value={id} />}
      <div>
        <label className="label" htmlFor={`lc${k}`}>Catégorie</label>
        <input id={`lc${k}`} name="category" defaultValue={category} required maxLength={80} list="link-cats" className="input" />
        <datalist id="link-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
      </div>
      <div>
        <label className="label" htmlFor={`ll${k}`}>Titre</label>
        <input id={`ll${k}`} name="label" defaultValue={label} required maxLength={120} className="input" />
      </div>
      <div>
        <label className="label" htmlFor={`lu${k}`}>Adresse</label>
        <input id={`lu${k}`} name="url" type="url" defaultValue={url} required maxLength={1000} placeholder="https://…" className="input" />
      </div>
      <div>
        <label className="label" htmlFor={`ld${k}`}>Description (facultatif)</label>
        <input id={`ld${k}`} name="description" defaultValue={description} maxLength={255} className="input" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Feedback state={state} />
        <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : id ? "Enregistrer" : "Ajouter le lien"}</button>
      </div>
    </form>
  );
}

export function RenameCategoryForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(renameWikiCategory, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="from" value={name} />
      <input name="to" defaultValue={name} required maxLength={80} aria-label={`Nouveau nom de la catégorie ${name}`} className="input w-auto min-w-40 flex-1" />
      <button className="btn-ghost" disabled={pending}>{pending ? "…" : "Renommer"}</button>
      <Feedback state={state} />
    </form>
  );
}
