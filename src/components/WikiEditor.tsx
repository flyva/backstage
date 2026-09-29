"use client";

import { useActionState, useState } from "react";
import { savePage } from "@/lib/wiki-actions";
import { Markdown } from "@/components/Markdown";

type Props = { pageId?: number; title?: string; category?: string; body?: string; categories: string[] };

export function WikiEditor({ pageId, title = "", category = "", body = "", categories }: Props) {
  const [state, action, pending] = useActionState(savePage, undefined);
  const [text, setText] = useState(body);
  const [tab, setTab] = useState<"write" | "preview">("write");

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

      <div>
        <div className="mb-1 flex gap-1" role="tablist">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1 text-xs ${tab === t ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"}`}
            >
              {t === "write" ? "Écrire" : "Aperçu"}
            </button>
          ))}
        </div>
        {/* Le textarea reste dans le DOM (masqué) pour que le contenu soit toujours envoyé. */}
        <textarea
          name="body"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={18}
          maxLength={100000}
          spellCheck
          placeholder={"# Titre\n\nÉcris en Markdown : **gras**, listes, tableaux, `code`…\nLie une autre page avec [[Titre de la page]]."}
          className={`input font-mono ${tab === "write" ? "" : "hidden"}`}
        />
        {tab === "preview" && (
          <div className="card min-h-64">
            {text.trim() ? <Markdown>{text}</Markdown> : <p className="text-sm text-muted">Rien à afficher.</p>}
          </div>
        )}
      </div>

      {state?.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
      <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer la page"}</button>
    </form>
  );
}
