"use client";

import { useActionState } from "react";
import { saveNews } from "@/lib/news-actions";
import { MarkdownField } from "@/components/MarkdownField";

type Props = { postId?: number; title?: string; body?: string; scope?: "ecole" | "bde"; pinned?: boolean; isAdmin: boolean };

export function NewsForm({ postId, title = "", body = "", scope = "ecole", pinned = false, isAdmin }: Props) {
  const [state, action, pending] = useActionState(saveNews, undefined);
  return (
    <form action={action} className="space-y-4">
      {postId && <input type="hidden" name="postId" value={postId} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
        <div>
          <label className="label" htmlFor="title">Titre</label>
          <input id="title" name="title" defaultValue={title} required maxLength={200} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="scope">Rubrique</label>
          <select id="scope" name="scope" defaultValue={scope} className="input">
            <option value="ecole">École</option>
            <option value="bde">BDE</option>
          </select>
        </div>
      </div>
      <MarkdownField defaultValue={body} rows={12} maxLength={50000} placeholder="Écris en Markdown : **gras**, listes, liens…" />
      {isAdmin && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="pinned" defaultChecked={pinned} className="size-4 accent-[var(--accent)]" />
          Épingler en haut du fil
        </label>
      )}
      {state?.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
      <button className="btn" disabled={pending}>{pending ? "Publication…" : "Publier"}</button>
    </form>
  );
}
