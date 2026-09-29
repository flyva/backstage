"use client";

import { useActionState } from "react";
import { createAlbum } from "@/lib/gallery-actions";

export function AlbumForm() {
  const [state, action, pending] = useActionState(createAlbum, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="title">Titre</label>
          <input id="title" name="title" required maxLength={150} placeholder="Gala 2026" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <input id="description" name="description" maxLength={500} className="input" />
        </div>
      </div>
      {state?.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
      <button className="btn" disabled={pending}>{pending ? "Création…" : "Créer l'album"}</button>
    </form>
  );
}
