import { CalendarDays, MessageSquare, Paperclip, CheckSquare, User } from "lucide-react";

export type Priority = "low" | "normal" | "high" | "urgent";

export type BoardCard = {
  id: number;
  title: string;
  description: string;
  assignees: { id: number; name: string }[];
  startDate: string | null;
  dueDate: string | null;
  priority: Priority;
  labels: string[];
  checklist: { id: number; text: string; done: boolean }[];
  comments: { id: number; userId: number; author: string; body: string; when: string }[];
  files: { id: number; name: string; size: number; mime: string }[];
};
export type BoardColumn = { id: number; title: string; cards: BoardCard[] };
export type BoardMember = { id: number; name: string };

export const PRIORITY_LABEL: Record<Priority, string> = { low: "Basse", normal: "Normale", high: "Haute", urgent: "Urgente" };
export const PRIORITY_RANK: Record<Priority, number> = { low: 0, normal: 1, high: 2, urgent: 3 };
const PRIORITY_CLS: Record<Priority, string> = {
  low: "bg-bg text-muted border border-line",
  normal: "bg-bg text-muted border border-line",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  urgent: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { timeZone: "UTC", day: "numeric", month: "short" });
export const fmtSize = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} Ko` : `${(b / 1024 / 1024).toFixed(1)} Mo`);
export const isLate = (card: BoardCard, columnTitle: string, today: string) => card.dueDate !== null && card.dueDate < today && columnTitle.toLowerCase() !== "fait";

export function PriorityPill({ priority }: { priority: Priority }) {
  if (priority === "normal") return null;
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PRIORITY_CLS[priority]}`}>{PRIORITY_LABEL[priority]}</span>;
}

// Couleur stable par étiquette (même mot = même teinte).
const hue = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
export function LabelChip({ label }: { label: string }) {
  const h = hue(label.toLowerCase());
  return (
    <span className="rounded-full px-2 py-0.5 text-[11px] font-medium text-fg" style={{ background: `hsl(${h} 70% 50% / 0.2)`, boxShadow: `inset 0 0 0 1px hsl(${h} 70% 50% / 0.45)` }}>
      {label}
    </span>
  );
}

/** Ligne d'indicateurs : tâches, fichiers, commentaires, assigné, échéance. */
export function CardMeta({ card, late }: { card: BoardCard; late: boolean }) {
  const done = card.checklist.filter((c) => c.done).length;
  const items = [
    card.checklist.length > 0 && (
      <span key="c" className={`flex items-center gap-1 ${done === card.checklist.length ? "text-green-600 dark:text-green-400" : ""}`}><CheckSquare size={12} /> {done}/{card.checklist.length}</span>
    ),
    card.files.length > 0 && <span key="f" className="flex items-center gap-1"><Paperclip size={12} /> {card.files.length}</span>,
    card.comments.length > 0 && <span key="m" className="flex items-center gap-1"><MessageSquare size={12} /> {card.comments.length}</span>,
    card.assignees.length > 0 && <span key="a" className="flex items-center gap-1"><User size={12} /> {card.assignees.map((a) => a.name).join(", ")}</span>,
    card.dueDate && (
      <span key="d" className={`flex items-center gap-1 ${late ? "font-medium text-danger" : ""}`}><CalendarDays size={12} /> {fmtDay(card.dueDate)}</span>
    ),
  ].filter(Boolean);
  if (items.length === 0) return null;
  return <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">{items}</div>;
}

/** Texte brut d'une description Markdown (pour l'aperçu sur la carte et dans le tableau). */
export const plain = (md: string) =>
  md.replace(/```[\s\S]*?```/g, " ").replace(/[*_`>#~]|\[([^\]]*)\]\([^)]*\)/g, (m, t) => t ?? "").replace(/\s+/g, " ").trim();
