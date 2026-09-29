import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { kanbanCards, kanbanColumns, projectMembers, users } from "@/db/schema";
import { can, requireProject } from "@/lib/projects";
import { createDefaultColumns } from "@/lib/kanban-actions";
import { todayParis } from "@/lib/equipment";
import { KanbanBoard, type BoardColumn } from "@/components/KanbanBoard";

export const metadata = { title: "Kanban" };

export default async function ProjectKanbanPage({ params }: PageProps<"/projets/[id]/kanban">) {
  const { id } = await params;
  const { project, role } = await requireProject(Number(id));
  const canEdit = can(role, "editor");

  const cols = await db.select().from(kanbanColumns).where(eq(kanbanColumns.projectId, project.id)).orderBy(asc(kanbanColumns.position), asc(kanbanColumns.id));
  const cards = cols.length
    ? await db
        .select({ card: kanbanCards, assignee: users.name })
        .from(kanbanCards)
        .leftJoin(users, eq(users.id, kanbanCards.assigneeId))
        .where(inArray(kanbanCards.columnId, cols.map((c) => c.id)))
        .orderBy(asc(kanbanCards.position), asc(kanbanCards.id))
    : [];
  const members = await db
    .select({ id: users.id, name: users.name })
    .from(projectMembers)
    .innerJoin(users, eq(users.id, projectMembers.userId))
    .where(eq(projectMembers.projectId, project.id))
    .orderBy(asc(users.name));

  const byCol = Map.groupBy(cards, (c) => c.card.columnId);
  const board: BoardColumn[] = cols.map((c) => ({
    id: c.id,
    title: c.title,
    cards: (byCol.get(c.id) ?? []).map(({ card, assignee }) => ({
      id: card.id,
      title: card.title,
      description: card.description ?? "",
      assigneeId: card.assigneeId,
      assigneeName: assignee,
      dueDate: card.dueDate,
    })),
  }));

  if (board.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">Ce projet n&apos;a pas encore de tableau.</p>
        {canEdit && (
          <form action={createDefaultColumns}>
            <input type="hidden" name="projectId" value={project.id} />
            <button className="btn">Créer les colonnes « À faire / En cours / Fait »</button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">Glisse les cartes entre les colonnes, ou utilise « Modifier / déplacer » sur mobile.</p>
      <KanbanBoard projectId={project.id} columns={board} members={members} canEdit={canEdit} today={todayParis()} />
    </div>
  );
}
