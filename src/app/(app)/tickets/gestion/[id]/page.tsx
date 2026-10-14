import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ticketComments, ticketFiles, tickets, users } from "@/db/schema";
import { requireTicketManager } from "@/lib/ticket-actions";
import { TicketDetail } from "@/components/TicketDetail";

export const metadata = { title: "Ticket" };

export default async function TicketManagementDetailPage({ params }: PageProps<"/tickets/gestion/[id]">) {
  await requireTicketManager();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  if (!ticket) notFound();

  const [author, files, comments] = await Promise.all([
    db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, ticket.createdBy)).limit(1),
    db.select().from(ticketFiles).where(eq(ticketFiles.ticketId, id)).orderBy(asc(ticketFiles.createdAt)),
    db
      .select({ id: ticketComments.id, body: ticketComments.body, at: ticketComments.createdAt, authorName: users.name })
      .from(ticketComments)
      .innerJoin(users, eq(users.id, ticketComments.userId))
      .where(eq(ticketComments.ticketId, id))
      .orderBy(asc(ticketComments.createdAt)),
  ]);

  return (
    <TicketDetail
      canManage
      backHref="/tickets/gestion"
      ticket={{ ...ticket, authorName: author[0]?.name ?? "Personne supprimée", files, comments }}
    />
  );
}
