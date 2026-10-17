import { count, eq, inArray, sql } from "drizzle-orm";
import { CheckSquare, FileText, SquareKanban, Users } from "lucide-react";
import { db } from "@/db";
import { checklistItems, checklists, kanbanCardAssignees, kanbanCards, kanbanColumns, projectFiles, projectMembers, users } from "@/db/schema";
import { requireProject } from "@/lib/projects";

export const metadata = { title: "Statistiques du projet" };

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number | string }) {
  return (
    <div className="card flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><Icon size={18} aria-hidden /></span>
      <div><div className="text-2xl font-bold tabular-nums">{value}</div><div className="text-xs text-muted">{label}</div></div>
    </div>
  );
}

export default async function ProjectStatsPage({ params }: PageProps<"/projets/[id]/stats">) {
  const { id } = await params;
  const { project } = await requireProject(Number(id));

  const [checklistRows, columns, members, filesAgg] = await Promise.all([
    db.select({ done: checklistItems.done, n: count() }).from(checklistItems).innerJoin(checklists, eq(checklists.id, checklistItems.checklistId)).where(eq(checklists.projectId, project.id)).groupBy(checklistItems.done),
    db.select({ id: kanbanColumns.id, title: kanbanColumns.title, position: kanbanColumns.position }).from(kanbanColumns).where(eq(kanbanColumns.projectId, project.id)).orderBy(kanbanColumns.position),
    db.select({ id: users.id, name: users.name, avatar: users.avatarFile }).from(projectMembers).innerJoin(users, eq(users.id, projectMembers.userId)).where(eq(projectMembers.projectId, project.id)),
    db.select({ n: count(), size: sql<number>`coalesce(sum(${projectFiles.size}), 0)` }).from(projectFiles).where(eq(projectFiles.projectId, project.id)),
  ]);

  const columnIds = columns.map((c) => c.id);
  const [cardsByColumn, cardsByAssignee] = await Promise.all([
    columnIds.length ? db.select({ columnId: kanbanCards.columnId, n: count() }).from(kanbanCards).where(inArray(kanbanCards.columnId, columnIds)).groupBy(kanbanCards.columnId) : [],
    columnIds.length ? db.select({ userId: kanbanCardAssignees.userId, n: count() }).from(kanbanCardAssignees).innerJoin(kanbanCards, eq(kanbanCards.id, kanbanCardAssignees.cardId)).where(inArray(kanbanCards.columnId, columnIds)).groupBy(kanbanCardAssignees.userId) : [],
  ]);

  const doneItems = checklistRows.find((r) => r.done)?.n ?? 0;
  const totalItems = checklistRows.reduce((a, r) => a + r.n, 0);
  const pct = totalItems ? Math.round((doneItems / totalItems) * 100) : null;
  const totalCards = cardsByColumn.reduce((a, r) => a + r.n, 0);
  const cardsPerColumn = new Map(cardsByColumn.map((r) => [r.columnId, r.n]));
  const assigneeCount = new Map(cardsByAssignee.map((r) => [r.userId, r.n]));
  const fmtMb = (n: number) => `${(n / (1024 * 1024)).toFixed(1)} Mo`;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label="Membres de l'équipe" value={members.length} />
        <Stat icon={SquareKanban} label="Cartes kanban" value={totalCards} />
        <Stat icon={CheckSquare} label="Checklist" value={pct !== null ? `${pct} %` : "—"} />
        <Stat icon={FileText} label="Fichiers" value={`${filesAgg[0]?.n ?? 0} (${fmtMb(Number(filesAgg[0]?.size ?? 0))})`} />
      </div>

      {totalItems > 0 && (
        <section className="card space-y-2">
          <h2 className="font-semibold">Checklists</h2>
          <div className="h-2 overflow-hidden rounded-full bg-bg">
            <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-sm text-muted">{doneItems} / {totalItems} tâches cochées</p>
        </section>
      )}

      {columns.length > 0 && (
        <section className="card space-y-2">
          <h2 className="font-semibold">Cartes par colonne</h2>
          <ul className="space-y-1.5 text-sm">
            {columns.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3">
                <span>{c.title}</span>
                <span className="font-medium tabular-nums">{cardsPerColumn.get(c.id) ?? 0}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {members.length > 0 && (
        <section className="card space-y-2">
          <h2 className="font-semibold">Cartes assignées, par personne</h2>
          <ul className="space-y-1.5 text-sm">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3">
                <span>{m.name}</span>
                <span className="font-medium tabular-nums">{assigneeCount.get(m.id) ?? 0}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
