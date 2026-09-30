"use client";

import Link from "next/link";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, LayoutGrid, Paperclip, Pencil, Plus, Table2, Trash2 } from "lucide-react";
import { addCard, addColumn, deleteColumn, moveCard, moveColumn, renameColumn } from "@/lib/kanban-actions";
import { CardDialog } from "@/components/KanbanCardDialog";
import {
  CardMeta, LabelChip, PRIORITY_LABEL, PRIORITY_RANK, PriorityPill, fmtDay, isLate, plain,
  type BoardCard, type BoardColumn, type BoardMember,
} from "@/components/kanban-shared";

export type { BoardCard, BoardColumn, BoardMember };

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

type SortKey = "title" | "column" | "priority" | "assignee" | "due" | "progress";

export function KanbanBoard(props: {
  projectId: number;
  columns: BoardColumn[];
  members: BoardMember[];
  canEdit: boolean;
  today: string;
  view: "kanban" | "tableau";
  currentUserId: number;
  isOwner: boolean;
}) {
  const { projectId, members, canEdit, today, view, currentUserId, isOwner } = props;
  const [columns, addOptimistic] = useOptimistic(props.columns, applyMove);
  const [, startTransition] = useTransition();
  const [dragging, setDragging] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<number | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  const move = (cardId: number, toColumnId: number, index: number) => {
    startTransition(async () => {
      addOptimistic({ cardId, toColumnId, index });
      await moveCard(cardId, toColumnId, index);
    });
  };
  const moveToEnd = (cardId: number, toColumnId: number) => move(cardId, toColumnId, Number.MAX_SAFE_INTEGER);

  let open: { card: BoardCard; column: BoardColumn } | null = null;
  for (const col of columns) {
    const card = col.cards.find((c) => c.id === openId);
    if (card) open = { card, column: col };
  }

  const tab = (v: "kanban" | "tableau") =>
    `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ${view === v ? "bg-accent text-accent-fg" : "border border-line text-muted hover:text-fg"}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <nav className="flex gap-1" aria-label="Affichage">
          <Link replace scroll={false} href="?vue=kanban" className={tab("kanban")} aria-current={view === "kanban" ? "page" : undefined}><LayoutGrid size={14} /> Kanban</Link>
          <Link replace scroll={false} href="?vue=tableau" className={tab("tableau")} aria-current={view === "tableau" ? "page" : undefined}><Table2 size={14} /> Tableau</Link>
        </nav>
        <p className="text-xs text-muted">
          {view === "kanban" ? "Glisse les cartes entre les colonnes ; clique sur une carte pour l'ouvrir." : "Clique sur un titre pour ouvrir la carte, sur un en-tête pour trier."}
        </p>
      </div>

      {view === "kanban" ? (
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
                  const desc = plain(card.description);
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
                      onClick={() => setOpenId(card.id)}
                      onKeyDown={(e) => { if (e.key === "Enter") setOpenId(card.id); }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Ouvrir la carte ${card.title}`}
                      className={`rounded-lg border border-line bg-bg p-2.5 text-sm hover:border-accent ${canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${dragging === card.id ? "opacity-40" : ""}`}
                    >
                      {(card.labels.length > 0 || card.priority !== "normal") && (
                        <div className="mb-1.5 flex flex-wrap gap-1">
                          <PriorityPill priority={card.priority} />
                          {card.labels.map((l) => <LabelChip key={l} label={l} />)}
                        </div>
                      )}
                      <div className="font-medium leading-snug">{card.title}</div>
                      {desc && <p className="mt-1 line-clamp-2 text-xs text-muted">{desc}</p>}
                      <CardMeta card={card} late={isLate(card, col.title, today)} />
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
      ) : (
        <CardTable projectId={projectId} columns={columns} today={today} canEdit={canEdit} members={members} onOpen={setOpenId} onMove={moveToEnd} />
      )}

      <CardDialog
        card={open?.card ?? null}
        column={open?.column ?? null}
        columns={columns}
        members={members}
        projectId={projectId}
        canEdit={canEdit}
        currentUserId={currentUserId}
        isOwner={isOwner}
        onClose={() => setOpenId(null)}
        onMove={moveToEnd}
      />
    </div>
  );
}

function CardTable({
  projectId, columns, today, canEdit, members, onOpen, onMove,
}: {
  projectId: number;
  columns: BoardColumn[];
  today: string;
  canEdit: boolean;
  members: BoardMember[];
  onOpen: (id: number) => void;
  onMove: (cardId: number, columnId: number) => void;
}) {
  const [q, setQ] = useState("");
  const [assignee, setAssignee] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "column", dir: 1 });

  const rows = useMemo(() => {
    const all = columns.flatMap((column, ci) => column.cards.map((card, i) => ({ card, column, ci, i })));
    const needle = q.trim().toLowerCase();
    const filtered = all.filter(({ card }) =>
      (!assignee || (assignee === "none" ? card.assigneeId === null : String(card.assigneeId) === assignee)) &&
      (!needle || `${card.title} ${card.description} ${card.labels.join(" ")}`.toLowerCase().includes(needle)),
    );
    const progress = (c: BoardCard) => (c.checklist.length ? c.checklist.filter((x) => x.done).length / c.checklist.length : -1);
    const cmp = (a: (typeof all)[number], b: (typeof all)[number]) => {
      switch (sort.key) {
        case "title": return a.card.title.localeCompare(b.card.title, "fr");
        case "column": return a.ci - b.ci || a.i - b.i;
        case "priority": return PRIORITY_RANK[a.card.priority] - PRIORITY_RANK[b.card.priority];
        case "assignee": return (a.card.assigneeName ?? "￿").localeCompare(b.card.assigneeName ?? "￿", "fr");
        case "due": return (a.card.dueDate ?? "9999").localeCompare(b.card.dueDate ?? "9999");
        case "progress": return progress(a.card) - progress(b.card);
      }
    };
    return filtered.sort((a, b) => cmp(a, b) * sort.dir);
  }, [columns, q, assignee, sort]);

  const th = (key: SortKey, label: string) => (
    <th scope="col" className="whitespace-nowrap px-3 py-2 text-left font-medium" aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "priority" ? -1 : 1 }))}
        className="flex items-center gap-1 hover:text-fg"
      >
        {label}
        {sort.key === key && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    </th>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Filtrer les cartes…" aria-label="Filtrer les cartes" className="input h-9 max-w-xs" />
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Filtrer par personne" className="input h-9 w-auto">
          <option value="">Tout le monde</option>
          <option value="none">Non assignées</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <span className="self-center text-xs text-muted">{rows.length} carte{rows.length > 1 ? "s" : ""}</span>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              {th("title", "Carte")}
              {th("column", "Statut")}
              {th("priority", "Priorité")}
              {th("assignee", "Assigné à")}
              {th("due", "Échéance")}
              <th scope="col" className="px-3 py-2 text-left font-medium">Étiquettes</th>
              {th("progress", "Tâches")}
              <th scope="col" className="px-3 py-2 text-left font-medium">Fichiers</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-muted">Aucune carte.</td></tr>
            )}
            {rows.map(({ card, column }) => {
              const done = card.checklist.filter((c) => c.done).length;
              const late = isLate(card, column.title, today);
              return (
                <tr key={card.id} className="align-top hover:bg-bg">
                  <td className="max-w-xs px-3 py-2">
                    <button type="button" onClick={() => onOpen(card.id)} className="text-left font-medium hover:text-accent hover:underline">{card.title}</button>
                    {card.description && <p className="line-clamp-1 text-xs text-muted">{plain(card.description)}</p>}
                  </td>
                  <td className="px-3 py-2">
                    {canEdit ? (
                      <select value={column.id} onChange={(e) => onMove(card.id, Number(e.target.value))} aria-label={`Statut de ${card.title}`} className="input h-8 w-auto py-0 text-xs">
                        {columns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    ) : column.title}
                  </td>
                  <td className="px-3 py-2">{card.priority === "normal" ? <span className="text-muted">{PRIORITY_LABEL.normal}</span> : <PriorityPill priority={card.priority} />}</td>
                  <td className="whitespace-nowrap px-3 py-2">{card.assigneeName ?? <span className="text-muted">–</span>}</td>
                  <td className={`whitespace-nowrap px-3 py-2 ${late ? "font-medium text-danger" : ""}`}>{card.dueDate ? fmtDay(card.dueDate) : <span className="text-muted">–</span>}</td>
                  <td className="px-3 py-2"><div className="flex flex-wrap gap-1">{card.labels.map((l) => <LabelChip key={l} label={l} />)}</div></td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {card.checklist.length ? (
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-line"><span className="block h-full bg-accent" style={{ width: `${(done / card.checklist.length) * 100}%` }} /></span>
                        <span className="text-xs text-muted">{done}/{card.checklist.length}</span>
                      </span>
                    ) : <span className="text-muted">–</span>}
                  </td>
                  <td className="px-3 py-2">
                    {card.files.length ? (
                      <ul className="space-y-0.5">
                        {card.files.map((f) => (
                          <li key={f.id} className="flex max-w-48 items-center gap-1 text-xs">
                            <Paperclip size={11} className="shrink-0 text-muted" />
                            <a href={`/api/projects/${projectId}/files/${f.id}`} target="_blank" rel="noopener noreferrer" className="truncate hover:underline" title={f.name}>{f.name}</a>
                          </li>
                        ))}
                      </ul>
                    ) : <span className="text-muted">–</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
