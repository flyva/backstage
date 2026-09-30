import "server-only";
import { and, asc, eq, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { kanbanCardAssignees, kanbanCards, kanbanColumns, projects } from "@/db/schema";

export type DueCard = {
  userId: number;
  cardId: number;
  title: string;
  dueDate: string;
  projectId: number;
  projectName: string;
  personal: boolean;
};

/**
 * Cartes kanban à échéance (aujourd'hui, demain ou en retard) qui ne sont pas dans la colonne « Fait ».
 * Une carte concerne ses personnes assignées ; une carte sans assigné d'un kanban personnel concerne son propriétaire.
 */
export async function dueCards(limit: string, userId?: number): Promise<DueCard[]> {
  const who = sql<number>`coalesce(${kanbanCardAssignees.userId}, ${projects.personalOf})`;
  const rows = await db
    .select({
      userId: who,
      cardId: kanbanCards.id,
      title: kanbanCards.title,
      dueDate: kanbanCards.dueDate,
      projectId: projects.id,
      projectName: projects.name,
      personalOf: projects.personalOf,
    })
    .from(kanbanCards)
    .innerJoin(kanbanColumns, eq(kanbanColumns.id, kanbanCards.columnId))
    .innerJoin(projects, eq(projects.id, kanbanColumns.projectId))
    .leftJoin(kanbanCardAssignees, eq(kanbanCardAssignees.cardId, kanbanCards.id))
    .where(
      and(
        isNotNull(kanbanCards.dueDate),
        lte(kanbanCards.dueDate, limit),
        sql`lower(${kanbanColumns.title}) <> 'fait'`,
        userId ? sql`${who} = ${userId}` : sql`${who} is not null`,
      ),
    )
    .orderBy(asc(kanbanCards.dueDate), asc(kanbanCards.id));
  return rows.map((r) => ({
    userId: Number(r.userId),
    cardId: r.cardId,
    title: r.title,
    dueDate: r.dueDate!,
    projectId: r.projectId,
    projectName: r.projectName,
    personal: r.personalOf !== null,
  }));
}

export const cardHref = (c: Pick<DueCard, "projectId" | "personal">) => (c.personal ? "/kanban" : `/projets/${c.projectId}/kanban`);
