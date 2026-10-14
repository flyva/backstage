import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Plus, Settings2 } from "lucide-react";
import { db } from "@/db";
import { tickets } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ago } from "@/lib/relative-time";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/ticket-shared";

export const metadata = { title: "Tickets" };

export default async function TicketsPage() {
  const user = await requireUser();
  const mine = await db.select().from(tickets).where(eq(tickets.createdBy, user.id)).orderBy(desc(tickets.createdAt));

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Tickets</h1>
          <p className="text-sm text-muted">Signale un problème (matériel, site, école…) et suis son traitement.</p>
        </div>
        <div className="flex gap-2">
          {user.perms.tickets && <Link href="/tickets/gestion" className="btn-ghost"><Settings2 size={16} /> Gestion</Link>}
          <Link href="/tickets/nouveau" className="btn"><Plus size={16} /> Nouveau ticket</Link>
        </div>
      </div>

      {mine.length === 0 ? (
        <p className="card text-sm text-muted">Tu n&apos;as encore créé aucun ticket.</p>
      ) : (
        <ul className="space-y-2">
          {mine.map((t) => (
            <li key={t.id}>
              <Link href={`/tickets/${t.id}`} className="card flex items-center gap-3 hover:border-accent">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{t.title}</span>
                  <span className="text-xs text-muted">Ouvert {ago(t.createdAt)} · mis à jour {ago(t.updatedAt)}</span>
                </span>
                <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ background: STATUS_COLOR[t.status] }}>{STATUS_LABEL[t.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
