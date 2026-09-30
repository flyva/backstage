"use client";

import { useActionState, useOptimistic, useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { FormState } from "@/lib/actions";
import { MarkdownField } from "@/components/MarkdownField";
import { createProject, updateProject, addMember, toggleItem, deleteItem } from "@/lib/project-actions";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

type ProjectDefaults = { id?: number; name?: string; description?: string; eventDate?: string };

function ProjectFields({ d }: { d: ProjectDefaults }) {
  return (
    <>
      <div>
        <label className="label" htmlFor="name">Nom du projet</label>
        <input id="name" name="name" defaultValue={d.name} required placeholder="Gala de fin d'année" className="input" />
      </div>
      <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <div>
          <label className="label" htmlFor="eventDate">Date de l&apos;évènement</label>
          <input id="eventDate" name="eventDate" type="date" defaultValue={d.eventDate} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <MarkdownField name="description" defaultValue={d.description} rows={4} maxLength={2000} placeholder="Lieu, contexte, contraintes…" label="Description" />
        </div>
      </div>
    </>
  );
}

export function CreateProjectForm() {
  const [state, action, pending] = useActionState(createProject, undefined);
  return (
    <form action={action} className="space-y-4">
      <ProjectFields d={{}} />
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Création…" : "Créer le projet"}</button>
    </form>
  );
}

export function EditProjectForm({ project }: { project: ProjectDefaults & { id: number } }) {
  const [state, action, pending] = useActionState(updateProject, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="projectId" value={project.id} />
      <ProjectFields d={project} />
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
    </form>
  );
}

export function AddMemberForm({ projectId }: { projectId: number }) {
  const [state, action, pending] = useActionState(addMember, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="flex flex-wrap gap-2">
        <input name="email" type="email" required placeholder="email@exemple.fr" aria-label="Email" className="input min-w-56 flex-1" />
        <select name="role" defaultValue="editor" aria-label="Rôle" className="input w-auto">
          <option value="editor">Éditeur</option>
          <option value="viewer">Lecteur</option>
          <option value="owner">Propriétaire</option>
        </select>
        <button className="btn" disabled={pending}>{pending ? "Ajout…" : "Ajouter"}</button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

// Case à cocher optimiste : l'interface réagit tout de suite, le serveur suit.
export function ChecklistItemRow(props: { id: number; label: string; done: boolean; canEdit: boolean }) {
  const [done, setDone] = useOptimistic(props.done);
  const [, startTransition] = useTransition();
  return (
    <li className="group flex items-center gap-3 py-1.5">
      <input
        type="checkbox"
        checked={done}
        disabled={!props.canEdit}
        aria-label={props.label}
        className="size-4 accent-[var(--accent)]"
        onChange={(e) => {
          const next = e.target.checked;
          startTransition(async () => {
            setDone(next);
            await toggleItem(props.id, next);
          });
        }}
      />
      <span className={`flex-1 text-sm ${done ? "text-muted line-through" : ""}`}>{props.label}</span>
      {props.canEdit && (
        <form action={deleteItem}>
          <input type="hidden" name="itemId" value={props.id} />
          <button className="text-muted opacity-0 hover:text-danger focus:opacity-100 group-hover:opacity-100" aria-label="Supprimer l'élément">
            <Trash2 size={14} />
          </button>
        </form>
      )}
    </li>
  );
}
