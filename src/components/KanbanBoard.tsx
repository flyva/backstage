"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, User, CalendarDays } from "lucide-react";
import type { FormState } from "@/lib/actions";
import {
  addCard, addColumn, deleteCard, deleteColumn, moveCard, moveColumn, renameColumn, updateCard,
} from "@/lib/kanban-actions";

export type BoardCard = {
  id: number;
  title: string;
  description: string;
  assigneeId: number | null;
  assigneeName: string | null;
  dueDate: string | null;
};
export type BoardColumn = { id: number; title: string; cards: BoardCard[] };
export type BoardMember = { id: number; name: string };

type Move = { cardId: number; toColumnId: number; index: number };

function applyMove(cols: BoardColumn[], m: Move): BoardColumn[] {
  let moving: BoardCard | undefined;
  const without = cols.map((c) => {
    const found = c.cards.find((x) => x.id === m.cardId);
    if (found) moving = found;
    return { ...c, cards: c.cards.filter((x) => x.id !== m.cardId) };
  });
  if (!moving) return cols;
  return without.map((c) => {
    if (c.id !== m.toColumnId) return c;
    const cards = [...c.cards];
    cards.splice(Math.max(0, Math.min(m.index, cards.length)), 0, moving!);
    return { ...c, cards };
  });
}

function EditCardForm({ card, members }: { card: BoardCard; members: BoardMember[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateCard, undefined);
  return (
    <form action={action} className="space-y-2 pt-2">
      <input type="hidden" name="cardId" value={card.id} />
      <input name="title" defaultValue={card.title} required maxLength={200} aria-label="Titre" className="input text-xs" />
      <textarea name="description" defaultValue={card.description} rows={3} maxLength={4000} placeholder="Détails…" aria-label="Description" className="input text-xs" />
      <div className="grid grid-cols-2 gap-2">
        <select name="assigneeId" defaultValue={card.assigneeId ?? ""} aria-label="Assigné à" className="input text-xs">
          <option value="">Personne</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <input name="dueDate" type="date" defaultValue={card.dueDate ?? ""} aria-label="Échéance" className="input text-xs" />
      </div>
      {state?.error && <p className="text-xs text-danger" role="alert">{state.error}</p>}
      {state?.ok && <p className="text-xs text-green-600 dark:text-green-400">{state.ok}</p>}
      <div className="flex items-center gap-2">
        <button className="btn text-xs" disabled={pending}>{pending ? "…" : "Enregistrer"}</button>
      </div>
    </form>
  );
}

export function KanbanBoard(props: { projectId: number; columns: BoardColumn[]; members: BoardMember[]; canEdit: boolean; today: string }) {
  const { projectId, members, canEdit, today } = props;
  const [columns, addOptimistic] = useOptimistic(props.columns, applyMove);
  const [, startTransition] = useTransition();
  const [dragging, setDragging] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<number | null>(null);

  const move = (cardId: number, toColumnId: number, index: number) => {
    startTransition(async () => {
      addOptimistic({ cardId, toColumnId, index });
      await moveCard(cardId, toColumnId, index);
    });
  };

  return (
    <div className="flex items-start gap-4 overflow-x-auto pb-4">
      {columns.map((col, ci) => (
        <section
          key={col.id}
          aria-label={col.title}
          onDragOver={(e) => {
            if (dragging !== null) { e.preventDefault(); setOverCol(col.id); }
          }}
          onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
          onDrop={(e) => {
            e.preventDefault();
            setOverCol(null);
            if (dragging !== null) move(dragging, col.id, col.cards.length);
            setDragging(null);
          }}
          className={`w-72 shrink-0 space-y-2 rounded-xl border bg-surface p-3 ${overCol === col.id ? "border-accent" : "border-line"}`}
        >
          <header className="flex items-center gap-1">
            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">
              {col.title} <span className="font-normal text-muted">{col.cards.length}</span>
            </h3>
            {canEdit && (
              <>
                <form action={moveColumn}>
                  <input type="hidden" name="columnId" value={col.id} />
                  <input type="hidden" name="dir" value="left" />
                  <button disabled={ci === 0} className="p-1 text-muted hover:text-fg disabled:opacity-30" aria-label={`Décaler ${col.title} à gauche`}><ChevronLeft size={14} /></button>
                </form>
                <form action={moveColumn}>
                  <input type="hidden" name="columnId" value={col.id} />
                  <input type="hidden" name="dir" value="right" />
                  <button disabled={ci === columns.length - 1} className="p-1 text-muted hover:text-fg disabled:opacity-30" aria-label={`Décaler ${col.title} à droite`}><ChevronRight size={14} /></button>
                </form>
                <details className="relative">
                  <summary className="cursor-pointer list-none p-1 text-muted hover:text-fg marker:hidden" aria-label="Réglages de la colonne"><Pencil size={14} /></summary>
                  <div className="absolute right-0 z-10 mt-1 w-56 space-y-2 rounded-lg border border-line bg-surface p-2 shadow-lg">
                    <form action={renameColumn} className="flex gap-1">
                      <input type="hidden" name="columnId" value={col.id} />
                      <input name="title" defaultValue={col.title} required maxLength={80} aria-label="Nom de la colonne" className="input text-xs" />
                      <button className="btn-ghost text-xs">OK</button>
                    </form>
                    <form action={deleteColumn}>
                      <input type="hidden" name="columnId" value={col.id} />
                      <button
                        className="flex items-center gap-1 text-xs text-danger"
                        onClick={(e) => {
                          if (!confirm(`Supprimer la colonne « ${col.title} » et ses ${col.cards.length} carte(s) ?`)) e.preventDefault();
                        }}
                      >
                        <Trash2 size={12} /> Supprimer la colonne
                      </button>
                    </form>
                  </div>
                </details>
              </>
            )}
          </header>

          <ul className="min-h-2 space-y-2">
            {col.cards.map((card, i) => {
              const late = card.dueDate !== null && card.dueDate < today && col.title.toLowerCase() !== "fait";
              return (
                <li
                  key={card.id}
                  draggable={canEdit}
                  onDragStart={(e) => { setDragging(card.id); e.dataTransfer.effectAllowed = "move"; }}
                  onDragEnd={() => { setDragging(null); setOverCol(null); }}
                  onDragOver={(e) => { if (dragging !== null) e.preventDefault(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOverCol(null);
                    if (dragging !== null && dragging !== card.id) move(dragging, col.id, i);
                    setDragging(null);
                  }}
                  className={`rounded-lg border border-line bg-bg p-2.5 text-sm ${canEdit ? "cursor-grab active:cursor-grabbing" : ""} ${dragging === card.id ? "opacity-40" : ""}`}
                >
                  <div className="font-medium leading-snug">{card.title}</div>
                  {card.description && <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-muted">{card.description}</p>}
                  {(card.assigneeName || card.dueDate) && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      {card.assigneeName && <span className="flex items-center gap-1"><User size={12} /> {card.assigneeName}</span>}
                      {card.dueDate && (
                        <span className={`flex items-center gap-1 ${late ? "font-medium text-danger" : ""}`}>
                          <CalendarDays size={12} /> {new Date(card.dueDate).toLocaleDateString("fr-FR", { timeZone: "UTC", day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  )}
                  {canEdit && (
                    <details className="mt-1.5">
                      <summary className="cursor-pointer list-none text-xs text-muted hover:text-fg marker:hidden">Modifier / déplacer</summary>
                      <div className="pt-2">
                        <label className="label">Déplacer vers</label>
                        <select
                          value={col.id}
                          aria-label="Déplacer vers la colonne"
                          onChange={(e) => move(card.id, Number(e.target.value), Number.MAX_SAFE_INTEGER)}
                          className="input text-xs"
                        >
                          {columns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                        <EditCardForm card={card} members={members} />
                        <form action={deleteCard} className="pt-2">
                          <input type="hidden" name="cardId" value={card.id} />
                          <button className="flex items-center gap-1 text-xs text-muted hover:text-danger"><Trash2 size={12} /> Supprimer la carte</button>
                        </form>
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>

          {canEdit && (
            <form action={addCard} className="flex gap-1">
              <input type="hidden" name="columnId" value={col.id} />
              <input name="title" required maxLength={200} placeholder="Nouvelle carte…" aria-label={`Nouvelle carte dans ${col.title}`} className="input text-xs" />
              <button className="btn-ghost px-2" aria-label="Ajouter la carte"><Plus size={14} /></button>
            </form>
          )}
        </section>
      ))}

      {canEdit && (
        <form action={addColumn} className="w-72 shrink-0 space-y-2 rounded-xl border border-dashed border-line p-3">
          <input type="hidden" name="projectId" value={projectId} />
          <input name="title" required maxLength={80} placeholder="Nouvelle colonne…" aria-label="Nom de la nouvelle colonne" className="input text-sm" />
          <button className="btn-ghost w-full text-xs"><Plus size={14} /> Ajouter une colonne</button>
        </form>
      )}
    </div>
  );
}
