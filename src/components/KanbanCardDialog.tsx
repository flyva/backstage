"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Paperclip, Plus, Trash2, X } from "lucide-react";
import {
  addChecklistItem, addComment, deleteCard, deleteCardFile, deleteChecklistItem, deleteComment, toggleChecklistItem, updateCard,
} from "@/lib/kanban-actions";
import { Markdown } from "@/components/Markdown";
import { MarkdownField } from "@/components/MarkdownField";
import { TagPicker } from "@/components/TagPicker";
import {
  LabelChip, PRIORITY_LABEL, PriorityPill, fmtDay, fmtSize, type BoardCard, type BoardColumn, type BoardMember, type Priority,
} from "@/components/kanban-shared";

const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="space-y-2 border-t border-line pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function EditForm({ card, members }: { card: BoardCard; members: BoardMember[] }) {
  // Enregistrement automatique : chaque modification est envoyée après une courte pause dans la saisie (et à la fermeture).
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | { error: string }>("idle");

  const save = async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const el = form.current;
    if (!el || !dirty.current) return;
    if (!el.reportValidity()) return; // titre vide : on attend qu'il soit rempli
    dirty.current = false;
    setStatus("saving");
    const res = await updateCard(undefined, new FormData(el));
    setStatus(res?.error ? { error: res.error } : "saved");
  };
  const schedule = (delay = 800) => {
    dirty.current = true;
    setStatus("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void save(); }, delay);
  };
  const saveRef = useRef(save);
  useEffect(() => { saveRef.current = save; });
  // Fermeture de la fenêtre (ou changement de carte) : ce qui n'est pas encore parti est envoyé tout de suite.
  useEffect(() => () => { void saveRef.current(); }, []);

  return (
    <form ref={form} onChange={() => schedule()} onBlur={() => { if (dirty.current) void save(); }} onSubmit={(e) => { e.preventDefault(); void save(); }} className="space-y-3">
      <input type="hidden" name="cardId" value={card.id} />
      <div>
        <label className="label" htmlFor={`t${card.id}`}>Titre</label>
        <input id={`t${card.id}`} name="title" defaultValue={card.title} required maxLength={200} className="input" />
      </div>
      <div>
        <label className="label">Description</label>
        <MarkdownField name="description" defaultValue={card.description} rows={6} maxLength={4000} label="Description de la carte" onEdit={() => schedule()} placeholder="Détails, consignes, liens…" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor={`a${card.id}`}>Assigné à (une ou plusieurs personnes)</label>
          <TagPicker id={`a${card.id}`} name="assigneeIds" options={members.map((m) => ({ value: m.id, label: m.name }))} defaultValue={card.assignees.map((a) => a.id)} placeholder="Tape un nom…" onChange={() => schedule(200)} />
        </div>
        <div>
          <label className="label" htmlFor={`p${card.id}`}>Priorité</label>
          <select id={`p${card.id}`} name="priority" defaultValue={card.priority} className="input">
            {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`s${card.id}`}>Début</label>
          <input id={`s${card.id}`} name="startDate" type="date" defaultValue={card.startDate ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor={`d${card.id}`}>Échéance</label>
          <input id={`d${card.id}`} name="dueDate" type="date" defaultValue={card.dueDate ?? ""} className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor={`l${card.id}`}>Étiquettes</label>
        <input id={`l${card.id}`} name="labels" defaultValue={card.labels.join(", ")} maxLength={200} placeholder="son, lumière, urgent (séparées par des virgules)" className="input" />
      </div>
      <p className="h-5 text-xs" role="status" aria-live="polite">
        {status === "saving" && <span className="text-muted">Enregistrement…</span>}
        {status === "saved" && <span className="text-green-600 dark:text-green-400">Enregistré automatiquement</span>}
        {typeof status === "object" && <span className="text-danger">{status.error}</span>}
      </p>
    </form>
  );
}

function ReadOnly({ card, members }: { card: BoardCard; members: BoardMember[] }) {
  void members;
  return (
    <div className="space-y-3 text-sm">
      {card.description ? <Markdown breaks>{card.description}</Markdown> : <p className="text-muted">Pas de description.</p>}
      <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
        <div><dt className="inline text-muted">Assigné à : </dt><dd className="inline">{card.assignees.length ? card.assignees.map((a) => a.name).join(", ") : "Personne"}</dd></div>
        <div><dt className="inline text-muted">Priorité : </dt><dd className="inline">{PRIORITY_LABEL[card.priority]}</dd></div>
        <div><dt className="inline text-muted">Début : </dt><dd className="inline">{card.startDate ? fmtDay(card.startDate) : "–"}</dd></div>
        <div><dt className="inline text-muted">Échéance : </dt><dd className="inline">{card.dueDate ? fmtDay(card.dueDate) : "–"}</dd></div>
      </dl>
    </div>
  );
}

function Checklist({ card, canEdit }: { card: BoardCard; canEdit: boolean }) {
  const [text, setText] = useState("");
  const [, start] = useTransition();
  const done = card.checklist.filter((c) => c.done).length;
  const pct = card.checklist.length ? Math.round((done / card.checklist.length) * 100) : 0;
  return (
    <Section title={`Tâches${card.checklist.length ? ` (${done}/${card.checklist.length})` : ""}`}>
      {card.checklist.length > 0 && (
        <div className="h-1.5 overflow-hidden rounded-full bg-bg" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Avancement des tâches">
          <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
      <ul className="space-y-1">
        {card.checklist.map((it) => (
          <li key={it.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={it.done}
              disabled={!canEdit}
              onChange={(e) => start(() => { void toggleChecklistItem(it.id, e.target.checked); })}
              aria-label={it.text}
              className="size-4 accent-[var(--accent)]"
            />
            <span className={`min-w-0 flex-1 break-words ${it.done ? "text-muted line-through" : ""}`}>{it.text}</span>
            {canEdit && (
              <button type="button" className="p-1 text-muted hover:text-danger" aria-label="Supprimer la tâche" onClick={() => start(() => { void deleteChecklistItem(it.id); })}>
                <Trash2 size={13} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {canEdit && (
        <form
          className="flex gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            const t = text.trim();
            if (!t) return;
            setText("");
            start(() => { void addChecklistItem(card.id, t); });
          }}
        >
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={200} placeholder="Ajouter une tâche…" aria-label="Nouvelle tâche" className="input text-sm" />
          <button className="btn-ghost px-2" aria-label="Ajouter la tâche"><Plus size={14} /></button>
        </form>
      )}
    </Section>
  );
}

function Files({ card, projectId, canEdit }: { card: BoardCard; projectId: number; canEdit: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setError(null);
    setBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("cardId", String(card.id));
    try {
      const res = await fetch(`/api/projects/${projectId}/files`, { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) setError(data.error ?? "Envoi impossible");
      else router.refresh();
    } catch {
      setError("Envoi impossible");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <Section title={`Fichiers${card.files.length ? ` (${card.files.length})` : ""}`}>
      {card.files.length === 0 && <p className="text-sm text-muted">Aucun fichier.</p>}
      <ul className="space-y-1">
        {card.files.map((f) => {
          const isImage = f.mime.startsWith("image/");
          const href = `/api/projects/${projectId}/files/${f.id}`;
          return (
            <li key={f.id} className="flex items-center gap-2 rounded-lg border border-line bg-bg p-2 text-sm">
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={href} alt="" className="size-10 shrink-0 rounded object-cover" />
              ) : (
                <Paperclip size={16} className="shrink-0 text-muted" />
              )}
              <a href={href} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate hover:underline" title={f.name}>{f.name}</a>
              <span className="shrink-0 text-xs text-muted">{fmtSize(f.size)}</span>
              <a href={href} download={f.name} className="p-1 text-muted hover:text-fg" aria-label={`Télécharger ${f.name}`}><Download size={14} /></a>
              {canEdit && (
                <button
                  type="button"
                  className="p-1 text-muted hover:text-danger"
                  aria-label={`Supprimer ${f.name}`}
                  onClick={() => { if (confirm(`Supprimer « ${f.name} » ?`)) start(() => { void deleteCardFile(f.id); }); }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {canEdit && (
        <div>
          <input
            ref={input}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx,.pptx,.odt,.ods,.odp,.zip,application/pdf,image/jpeg,image/png"
            disabled={busy}
            aria-label="Ajouter un fichier"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }}
            className="input text-xs"
          />
          <p className="mt-1 text-xs text-muted">{busy ? "Envoi en cours…" : "PDF, images, Word, Excel, PowerPoint ou ZIP — 15 Mo max."}</p>
          {error && <p className="text-xs text-danger" role="alert">{error}</p>}
        </div>
      )}
    </Section>
  );
}

function Comments({ card, currentUserId, isOwner }: { card: BoardCard; currentUserId: number; isOwner: boolean }) {
  const [text, setText] = useState("");
  const [, start] = useTransition();
  return (
    <Section title={`Commentaires${card.comments.length ? ` (${card.comments.length})` : ""}`}>
      <ul className="space-y-2">
        {card.comments.map((c) => (
          <li key={c.id} className="rounded-lg border border-line bg-bg p-2.5 text-sm">
            <div className="flex items-center justify-between gap-2 text-xs text-muted">
              <span><strong className="text-fg">{c.author}</strong> · {when(c.when)}</span>
              {(c.userId === currentUserId || isOwner) && (
                <button type="button" className="hover:text-danger" aria-label="Supprimer le commentaire" onClick={() => start(() => { void deleteComment(c.id); })}>
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            <p className="mt-1 whitespace-pre-line break-words">{c.body}</p>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          const t = text.trim();
          if (!t) return;
          setText("");
          start(() => { void addComment(card.id, t); });
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Écrire un commentaire…" aria-label="Nouveau commentaire" className="input text-sm" />
        <button className="btn-ghost px-3 text-xs">Envoyer</button>
      </form>
    </Section>
  );
}

export function CardDialog({
  card, column, columns, members, projectId, canEdit, currentUserId, isOwner, onClose, onMove,
}: {
  card: BoardCard | null;
  column: BoardColumn | null;
  columns: BoardColumn[];
  members: BoardMember[];
  projectId: number;
  canEdit: boolean;
  currentUserId: number;
  isOwner: boolean;
  onClose: () => void;
  onMove: (cardId: number, toColumnId: number) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = card !== null;
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      aria-label={card ? `Carte : ${card.title}` : "Carte"}
      className="m-auto w-[min(44rem,calc(100vw-1.5rem))] max-h-[92vh] overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-fg backdrop:bg-black/50"
    >
      {card && column && (
        <div className="space-y-4 p-5">
          <header className="flex items-start gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <h2 className="break-words text-lg font-semibold leading-snug">{card.title}</h2>
              <div className="flex flex-wrap items-center gap-1.5">
                <PriorityPill priority={card.priority} />
                {card.labels.map((l) => <LabelChip key={l} label={l} />)}
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:text-fg" aria-label="Fermer"><X size={18} /></button>
          </header>

          <div>
            <label className="label" htmlFor={`col${card.id}`}>Colonne</label>
            <select
              id={`col${card.id}`}
              value={column.id}
              disabled={!canEdit}
              onChange={(e) => onMove(card.id, Number(e.target.value))}
              className="input"
            >
              {columns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>

          {canEdit ? <EditForm key={card.id} card={card} members={members} /> : <ReadOnly card={card} members={members} />}
          <Checklist card={card} canEdit={canEdit} />
          <Files card={card} projectId={projectId} canEdit={canEdit} />
          <Comments card={card} currentUserId={currentUserId} isOwner={isOwner} />

          {canEdit && (
            <form action={deleteCard} className="border-t border-line pt-4" onSubmit={(e) => { if (!confirm("Supprimer cette carte, ses tâches, fichiers et commentaires ?")) e.preventDefault(); else onClose(); }}>
              <input type="hidden" name="cardId" value={card.id} />
              <button className="flex items-center gap-1 text-sm text-muted hover:text-danger"><Trash2 size={14} /> Supprimer la carte</button>
            </form>
          )}
        </div>
      )}
    </dialog>
  );
}
