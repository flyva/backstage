import Link from "next/link";
import { Download, Paperclip } from "lucide-react";
import type { TicketStatus } from "@/db/schema";
import { ago } from "@/lib/relative-time";
import { TicketCommentForm, TicketStatusForm } from "@/components/ticket-forms";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/ticket-shared";

export type TicketDetailData = {
  id: number;
  title: string;
  body: string;
  status: TicketStatus;
  createdAt: Date;
  authorName: string;
  files: { id: number; originalName: string }[];
  comments: { id: number; body: string; at: Date; authorName: string }[];
};

/** Détail d'un ticket, partagé entre la page personnelle (/tickets/[id]) et la gestion (/tickets/gestion/[id]). */
export function TicketDetail({ ticket, canManage, backHref }: { ticket: TicketDetailData; canManage: boolean; backHref: string }) {
  return (
    <div className="max-w-3xl space-y-5">
      <p className="text-sm"><Link href={backHref} className="text-muted underline">← Tickets</Link></p>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{ticket.title}</h1>
          <p className="text-sm text-muted">Par {ticket.authorName} · ouvert {ago(ticket.createdAt)}</p>
        </div>
        {canManage ? (
          <TicketStatusForm ticketId={ticket.id} status={ticket.status} />
        ) : (
          <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ background: STATUS_COLOR[ticket.status] }}>{STATUS_LABEL[ticket.status]}</span>
        )}
      </header>

      <section className="card space-y-3">
        <p className="whitespace-pre-wrap text-sm">{ticket.body}</p>
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

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Suivi</h2>
        {ticket.comments.length === 0 ? (
          <p className="text-sm text-muted">Aucun message pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {ticket.comments.map((c) => (
              <li key={c.id} className="card space-y-1">
                <p className="flex items-center justify-between text-xs text-muted"><span className="font-medium">{c.authorName}</span> <span>{ago(c.at)}</span></p>
                <p className="whitespace-pre-wrap text-sm">{c.body}</p>
              </li>
            ))}
          </ul>
        )}
        <div className="card">
          <TicketCommentForm ticketId={ticket.id} />
        </div>
      </section>
    </div>
  );
}
