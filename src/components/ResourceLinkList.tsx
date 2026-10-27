"use client";

import { useActionState, useState } from "react";
import { ExternalLink, Plus, Star, Trash2 } from "lucide-react";
import type { FormState } from "@/lib/actions";
import { createResourceLink, deleteResourceLink, toggleResourceFavorite } from "@/lib/resource-links-actions";
import type { ResourceCategory } from "@/lib/resource-links";
import { ConfirmButton } from "@/components/ConfirmButton";

export type ResourceRow = { id: number; label: string; url: string; description: string; favorite: boolean; canDelete: boolean };

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

export function ResourceLinkList({ category, links }: { category: ResourceCategory; links: ResourceRow[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [addState, addAction, addPending] = useActionState(createResourceLink, undefined);
  const sorted = [...links].sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.label.localeCompare(b.label));

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => setShowAdd((v) => !v)} className="btn-ghost text-sm"><Plus size={15} /> Ajouter un lien</button>

      {showAdd && (
        <form action={addAction} className="card grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="category" value={category} />
          <div><label className="label" htmlFor="rl-label">Nom</label><input id="rl-label" name="label" required maxLength={150} className="input" /></div>
          <div><label className="label" htmlFor="rl-url">Lien</label><input id="rl-url" name="url" type="url" required placeholder="https://…" className="input" /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="rl-description">Description (facultatif)</label><input id="rl-description" name="description" maxLength={300} className="input" /></div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <button className="btn" disabled={addPending}>{addPending ? "…" : "Ajouter"}</button>
            <Feedback state={addState} />
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {sorted.length === 0 && <li className="card text-sm text-muted">Rien pour l&apos;instant. Ajoute le premier lien !</li>}
        {sorted.map((r) => (
          <li key={r.id} className="card flex items-start gap-3 p-3">
            <form action={toggleResourceFavorite} className="shrink-0">
              <input type="hidden" name="resourceId" value={r.id} />
              <input type="hidden" name="category" value={category} />
              <button type="submit" aria-label={r.favorite ? "Retirer des favoris" : "Mettre en favori"} className="rounded-lg p-1 text-muted hover:bg-bg hover:text-accent">
                <Star size={16} className={r.favorite ? "fill-accent text-accent" : ""} />
              </button>
            </form>
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 hover:opacity-80">
              <p className="flex items-center gap-1.5 font-medium">{r.label} <ExternalLink size={13} className="shrink-0 text-muted" /></p>
              {r.description && <p className="text-sm text-muted">{r.description}</p>}
              <p className="truncate text-xs text-muted">{r.url}</p>
            </a>
            {r.canDelete && (
              <form action={deleteResourceLink} className="shrink-0">
                <input type="hidden" name="id" value={r.id} />
                <ConfirmButton message="Supprimer ce lien de la liste partagée ?" className="rounded-lg p-1.5 text-muted hover:bg-bg hover:text-danger">
                  <Trash2 size={14} aria-label="Supprimer" />
                </ConfirmButton>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
