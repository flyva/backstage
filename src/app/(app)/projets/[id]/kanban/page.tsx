import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { kanbanCards, kanbanChecklist, kanbanColumns, kanbanComments, projectFiles, projectMembers, users } from "@/db/schema";
import { can, requireProject } from "@/lib/projects";
import { createDefaultColumns } from "@/lib/kanban-actions";
import { todayParis } from "@/lib/equipment";
import { KanbanBoard, type BoardColumn } from "@/components/KanbanBoard";

export const metadata = { title: "Kanban" };

export default async function ProjectKanbanPage({ params, searchParams }: PageProps<"/projets/[id]/kanban">) {
  const { id } = await params;
  const { vue } = await searchParams;
  const { user, project, role } = await requireProject(Number(id));
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

  const cardIds = cards.map((c) => c.card.id);
  const [checklist, comments, files] = cardIds.length
    ? await Promise.all([
        db.select().from(kanbanChecklist).where(inArray(kanbanChecklist.cardId, cardIds)).orderBy(asc(kanbanChecklist.position), asc(kanbanChecklist.id)),
        db
          .select({ c: kanbanComments, author: users.name })
          .from(kanbanComments)
          .innerJoin(users, eq(users.id, kanbanComments.userId))
          .where(inArray(kanbanComments.cardId, cardIds))
          .orderBy(asc(kanbanComments.createdAt), asc(kanbanComments.id)),
        db
          .select()
          .from(projectFiles)
          .where(and(eq(projectFiles.projectId, project.id), isNotNull(projectFiles.cardId)))
          .orderBy(asc(projectFiles.createdAt)),
      ])
    : [[], [], []];
  const checklistBy = Map.groupBy(checklist, (x) => x.cardId);
  const commentsBy = Map.groupBy(comments, (x) => x.c.cardId);
  const filesBy = Map.groupBy(files, (x) => x.cardId as number);

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
      startDate: card.startDate,
      dueDate: card.dueDate,
      priority: card.priority,
      labels: card.labels ? card.labels.split(",") : [],
      checklist: (checklistBy.get(card.id) ?? []).map((x) => ({ id: x.id, text: x.text, done: x.done })),
      comments: (commentsBy.get(card.id) ?? []).map(({ c, author }) => ({ id: c.id, userId: c.userId, author, body: c.body, when: c.createdAt.toISOString() })),
      files: (filesBy.get(card.id) ?? []).map((f) => ({ id: f.id, name: f.originalName, size: f.size, mime: f.mime })),
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
      <KanbanBoard projectId={project.id} columns={board} members={members} canEdit={canEdit} today={todayParis()} view={vue === "tableau" ? "tableau" : "kanban"} currentUserId={user.id} isOwner={role === "owner"} />
    </div>
  );
}
