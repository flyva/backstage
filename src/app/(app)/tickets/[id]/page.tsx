import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { Download, Paperclip } from "lucide-react";
import { db } from "@/db";
import { ticketComments, ticketFiles, tickets, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ago } from "@/lib/relative-time";
import { STATUS_COLOR, STATUS_LABEL, TicketCommentForm, TicketStatusForm } from "@/components/ticket-forms";

export const metadata = { title: "Ticket" };

export default async function TicketPage({ params }: PageProps<"/tickets/[id]">) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const admin = user.perms.administration;

  const [ticket] = await db.select().from(tickets).where(admin ? eq(tickets.id, id) : and(eq(tickets.id, id), eq(tickets.createdBy, user.id))).limit(1);
  if (!ticket) notFound();

  // L'auteur qui consulte son ticket le marque comme lu (plus de pastille « non lu » dans le menu/la cloche).
  if (ticket.createdBy === user.id) await db.update(tickets).set({ ownerReadAt: new Date() }).where(eq(tickets.id, id));

  const [author, files, comments] = await Promise.all([
    db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, ticket.createdBy)).limit(1),
    db.select().from(ticketFiles).where(eq(ticketFiles.ticketId, id)).orderBy(asc(ticketFiles.createdAt)),
    db
      .select({ id: ticketComments.id, body: ticketComments.body, at: ticketComments.createdAt, authorName: users.name, authorId: users.id })
      .from(ticketComments)
      .innerJoin(users, eq(users.id, ticketComments.userId))
      .where(eq(ticketComments.ticketId, id))
      .orderBy(asc(ticketComments.createdAt)),
  ]);

  return (
    <div className="max-w-3xl space-y-5">
      <p className="text-sm"><Link href={admin ? "/admin/tickets" : "/tickets"} className="text-muted underline">← Tickets</Link></p>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{ticket.title}</h1>
          <p className="text-sm text-muted">Par {author[0]?.name ?? "Personne supprimée"} · ouvert {ago(ticket.createdAt)}</p>
        </div>
        {admin ? (
          <TicketStatusForm ticketId={ticket.id} status={ticket.status} />
        ) : (
          <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ background: STATUS_COLOR[ticket.status] }}>{STATUS_LABEL[ticket.status]}</span>
        )}
      </header>

      <section className="card space-y-3">
        <p className="whitespace-pre-wrap text-sm">{ticket.body}</p>
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-line pt-3">
            {files.map((f) => (
              <a key={f.id} href={`/api/tickets/${ticket.id}/files/${f.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs hover:border-accent">
                <Paperclip size={12} /> {f.originalName} <Download size={12} className="text-muted" />
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Suivi</h2>
        {comments.length === 0 ? (
          <p className="text-sm text-muted">Aucun message pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {comments.map((c) => (
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
