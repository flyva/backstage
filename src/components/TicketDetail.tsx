import Link from "next/link";
import { ArrowLeft, Clock, Download, Inbox, Lock, MessageSquare, Paperclip, RotateCw, UserRound } from "lucide-react";
import type { TicketStatus } from "@/db/schema";
import { ago } from "@/lib/relative-time";
import { TicketCommentForm, TicketStatusForm } from "@/components/ticket-forms";
import { STATUS_LABEL } from "@/lib/ticket-shared";

export type TicketDetailData = {
  id: number;
  title: string;
  body: string;
  status: TicketStatus;
  createdAt: Date;
  updatedAt: Date;
  authorName: string;
  files: { id: number; originalName: string }[];
  comments: { id: number; userId: number; body: string; at: Date; authorName: string }[];
};

// Mêmes couleurs/icônes que les badges de statut d'OASIS (_macros.html.twig : status_badge), sur les statuts qui
// existent côté Backstage (pas de « en attente »/« résolu » séparés ici).
const STATUS_BADGE: Record<TicketStatus, { cls: string; icon: typeof Inbox }> = {
  open: { cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300", icon: Inbox },
  in_progress: { cls: "bg-accent/15 text-accent", icon: RotateCw },
  closed: { cls: "bg-zinc-500/15 text-muted", icon: Lock },
};

function StatusBadge({ status }: { status: TicketStatus }) {
  const { cls, icon: Icon } = STATUS_BADGE[status];
  return <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}><Icon size={12} aria-hidden /> {STATUS_LABEL[status]}</span>;
}

/**
 * Détail d'un ticket, partagé entre la page personnelle (/tickets/[id]) et la gestion (/tickets/gestion/[id]).
 * Repris de l'affichage du système de tickets d'OASIS (templates/ticket/show.html.twig) : colonne large à gauche
 * (message d'origine, puis fil de conversation) et colonne étroite à droite (traitement si gestion, métadonnées) —
 * sans les champs qu'OASIS a mais que Backstage n'a pas (catégorie, priorité, technicien assigné).
 */
export function TicketDetail({ ticket, canManage, viewerId, backHref }: { ticket: TicketDetailData; canManage: boolean; viewerId: number; backHref: string }) {
  return (
    <div className="space-y-4">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> Tickets</Link>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0 space-y-4">
          {/* Carte 1 : message d'origine */}
          <section className="card space-y-3">
            <header className="flex flex-wrap items-start justify-between gap-2">
              <h1 className="text-lg font-bold">{ticket.title}</h1>
              <StatusBadge status={ticket.status} />
            </header>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1"><UserRound size={12} aria-hidden /> {ticket.authorName}</span>
              <span className="flex items-center gap-1"><Clock size={12} aria-hidden /> ouvert {ago(ticket.createdAt)}</span>
            </p>
            <div className="whitespace-pre-wrap rounded-lg border border-line bg-bg p-3 text-sm">{ticket.body}</div>
            {ticket.files.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                {ticket.files.map((f) => (
                  <a key={f.id} href={`/api/tickets/${ticket.id}/files/${f.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs hover:border-accent">
                    <Paperclip size={12} /> {f.originalName} <Download size={12} className="text-muted" />
                  </a>
                ))}
              </div>
            )}
          </section>

          {/* Carte 2 : conversation */}
          <section className="card space-y-3">
            <h2 className="flex items-center gap-2 font-semibold"><MessageSquare size={16} className="text-accent" aria-hidden /> Conversation</h2>
            <div className="max-h-[420px] space-y-2 overflow-y-auto">
              {ticket.comments.length === 0 ? (
                <p className="text-sm text-muted">Aucun message pour le moment.</p>
              ) : (
                ticket.comments.map((c) => {
                  const isMe = c.userId === viewerId;
                  return (
                    <div key={c.id} className={`rounded-md border-l-[3px] bg-bg p-2.5 ${isMe ? "border-l-accent" : "border-l-line"}`}>
                      <p className="flex items-center justify-between text-xs text-muted"><strong className="font-medium text-fg">{c.authorName}</strong> <span>{ago(c.at)}</span></p>
                      <p className="whitespace-pre-wrap text-sm">{c.body}</p>
                    </div>
                  );
                })
              )}
            </div>
            <hr className="border-line" />
            <TicketCommentForm ticketId={ticket.id} />
          </section>
        </div>

        <aside className="space-y-4">
          {canManage && (
            <section className="card space-y-2">
              <h2 className="font-semibold">Traitement</h2>
              <TicketStatusForm ticketId={ticket.id} status={ticket.status} />
            </section>
          )}
          <section className="card">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-muted">Demandeur</dt><dd className="truncate font-medium">{ticket.authorName}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Ouvert le</dt><dd>{ago(ticket.createdAt)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Dernière MàJ</dt><dd>{ago(ticket.updatedAt)}</dd></div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
