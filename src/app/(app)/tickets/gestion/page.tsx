import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tickets, users } from "@/db/schema";
import { requireTicketManager } from "@/lib/ticket-actions";
import { ago } from "@/lib/relative-time";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/ticket-shared";

export const metadata = { title: "Gestion des tickets" };

export default async function TicketManagementPage() {
  await requireTicketManager();
  const rows = await db
    .select({ id: tickets.id, title: tickets.title, status: tickets.status, createdAt: tickets.createdAt, updatedAt: tickets.updatedAt, authorName: users.name })
    .from(tickets)
    .innerJoin(users, eq(users.id, tickets.createdBy))
    .orderBy(desc(tickets.updatedAt));

  const open = rows.filter((t) => t.status !== "closed");
  const closed = rows.filter((t) => t.status === "closed");

  const Row = ({ t }: { t: (typeof rows)[number] }) => (
    <Link href={`/tickets/gestion/${t.id}`} className="card flex items-center gap-3 hover:border-accent">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{t.title}</span>
        <span className="text-xs text-muted">{t.authorName} · mis à jour {ago(t.updatedAt)}</span>
      </span>
      <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ background: STATUS_COLOR[t.status] }}>{STATUS_LABEL[t.status]}</span>
    </Link>
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestion des tickets</h1>
        <p className="text-sm text-muted">Tous les tickets de la promo, tous auteurs confondus.</p>
      </div>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">En cours ({open.length})</h2>
        {open.length === 0 ? <p className="text-sm text-muted">Rien à traiter.</p> : <ul className="space-y-2">{open.map((t) => <li key={t.id}><Row t={t} /></li>)}</ul>}
      </section>
      {closed.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Fermés ({closed.length})</h2>
          <ul className="space-y-2">{closed.map((t) => <li key={t.id}><Row t={t} /></li>)}</ul>
        </section>
      )}
    </div>
  );
}
