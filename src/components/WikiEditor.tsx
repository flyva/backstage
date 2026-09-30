"use client";

import { useActionState } from "react";
import { savePage } from "@/lib/wiki-actions";
import { MarkdownField } from "@/components/MarkdownField";

type Props = { pageId?: number; title?: string; category?: string; body?: string; categories: string[] };

export function WikiEditor({ pageId, title = "", category = "", body = "", categories }: Props) {
  const [state, action, pending] = useActionState(savePage, undefined);

  return (
    <form action={action} className="space-y-4">
      {pageId && <input type="hidden" name="pageId" value={pageId} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
        <div>
          <label className="label" htmlFor="title">Titre</label>
          <input id="title" name="title" defaultValue={title} required maxLength={200} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="category">Catégorie</label>
          <input id="category" name="category" defaultValue={category || "Général"} required maxLength={80} list="wiki-cats" className="input" />
          <datalist id="wiki-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
      </div>

      <MarkdownField defaultValue={body} rows={18} placeholder="Écris ta page ici. Lie une autre page avec [[Titre de la page]]." label="Contenu de la page" />

      {state?.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
      <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer la page"}</button>
    </form>
  );
}
