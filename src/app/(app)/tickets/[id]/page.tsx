import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ticketComments, ticketFiles, tickets, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { TicketDetail } from "@/components/TicketDetail";

export const metadata = { title: "Ticket" };

export default async function TicketPage({ params }: PageProps<"/tickets/[id]">) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  // Page personnelle : uniquement le ticket de son propre auteur (la gestion de tous les tickets est sur /tickets/gestion).
  const [ticket] = await db.select().from(tickets).where(and(eq(tickets.id, id), eq(tickets.createdBy, user.id))).limit(1);
  if (!ticket) notFound();

  // L'auteur qui consulte son ticket le marque comme lu (plus de pastille « non lu » dans le menu/la cloche).
  await db.update(tickets).set({ ownerReadAt: new Date() }).where(eq(tickets.id, id));

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
      canManage={false}
      backHref="/tickets"
      ticket={{ ...ticket, authorName: author[0]?.name ?? "Personne supprimée", files, comments }}
    />
  );
}
