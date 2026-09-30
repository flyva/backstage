import { asc, eq, inArray } from "drizzle-orm";
import { AlertTriangle, Trash2 } from "lucide-react";
import { db } from "@/db";
import { buildSlotAssignees, buildSlots, projectMembers, users } from "@/db/schema";
import { can, requireProject } from "@/lib/projects";
import { dayLabel } from "@/lib/alternance";
import { deleteSlot } from "@/lib/build-actions";
import { slotConflicts } from "@/lib/planning";
import { SlotForm } from "@/components/build-forms";

export const metadata = { title: "Planning de montage" };

export default async function BuildPlanPage({ params }: PageProps<"/projets/[id]/planning">) {
  const { id } = await params;
  const { project, role } = await requireProject(Number(id));
  const canEdit = can(role, "editor");

  const [slots, members] = await Promise.all([
    db.select().from(buildSlots).where(eq(buildSlots.projectId, project.id)).orderBy(asc(buildSlots.day), asc(buildSlots.startTime), asc(buildSlots.id)),
    db.select({ id: users.id, name: users.name }).from(projectMembers).innerJoin(users, eq(users.id, projectMembers.userId)).where(eq(projectMembers.projectId, project.id)).orderBy(asc(users.name)),
  ]);
  const links = slots.length ? await db.select().from(buildSlotAssignees).where(inArray(buildSlotAssignees.slotId, slots.map((s) => s.id))) : [];
  const idsBy = Map.groupBy(links, (l) => l.slotId);
  const nameOf = new Map(members.map((m) => [m.id, m.name]));
  const full = slots.map((s) => ({ ...s, assigneeIds: (idsBy.get(s.id) ?? []).map((l) => l.userId) }));
  const conflicts = slotConflicts(full);
  const days = Map.groupBy(full, (s) => s.day);
  const defaultDay = project.eventDate ?? new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">Qui fait quoi, et quand, pendant le montage, les balances et le démontage. Une personne sur deux créneaux qui se chevauchent est signalée.</p>

      {canEdit && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Ajouter un créneau</h2>
          <SlotForm projectId={project.id} members={members} day={defaultDay} />
        </section>
      )}

      {slots.length === 0 && <p className="text-sm text-muted">Aucun créneau pour le moment.</p>}

      {[...days].map(([day, list]) => (
        <section key={day} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted first-letter:uppercase">{dayLabel(day)}</h2>
          <ul className="space-y-2">
            {list.map((s) => {
              const clash = conflicts.get(s.id);
              return (
                <li key={s.id} className={`card p-0 ${clash ? "border-danger" : ""}`}>
                  <div className="flex flex-wrap items-start gap-x-4 gap-y-1 p-3">
                    <span className="w-28 shrink-0 font-mono text-sm tabular-nums text-accent">{s.startTime} – {s.endTime}</span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="font-medium">{s.title}</div>
                      {s.notes && <div className="text-sm text-muted">{s.notes}</div>}
                      <div className="flex flex-wrap gap-1.5">
                        {s.assigneeIds.map((u) => (
                          <span key={u} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${clash?.includes(u) ? "bg-danger/15 text-danger" : "bg-accent/15"}`}>{nameOf.get(u) ?? "?"}</span>
                        ))}
                        {s.assigneeIds.length === 0 && <span className="text-xs text-muted">Personne d&apos;assigné</span>}
                      </div>
                      {clash && (
                        <p className="flex items-center gap-1 text-xs font-medium text-danger"><AlertTriangle size={12} /> Chevauche un autre créneau pour {clash.map((u) => nameOf.get(u) ?? "?").join(", ")}</p>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <details className="border-t border-line">
                      <summary className="cursor-pointer list-none px-3 py-1.5 text-xs text-muted hover:text-fg marker:hidden">Modifier</summary>
                      <div className="space-y-3 p-3 pt-1">
                        <SlotForm projectId={project.id} members={members} id={s.id} day={s.day} startTime={s.startTime} endTime={s.endTime} title={s.title} notes={s.notes ?? ""} assigneeIds={s.assigneeIds} />
                        <form action={deleteSlot} className="border-t border-line pt-3">
                          <input type="hidden" name="projectId" value={project.id} />
                          <input type="hidden" name="id" value={s.id} />
                          <button className="flex items-center gap-1 text-xs text-muted hover:text-danger"><Trash2 size={14} /> Supprimer le créneau</button>
                        </form>
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
