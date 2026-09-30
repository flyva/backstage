import { asc, eq, inArray } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { db } from "@/db";
import { checklistItems, checklists } from "@/db/schema";
import { can, requireProject } from "@/lib/projects";
import { getChecklistTemplates } from "@/lib/checklist-templates";
import { addChecklist, addItem, deleteChecklist } from "@/lib/project-actions";
import { ChecklistItemRow } from "@/components/project-forms";

export default async function ProjectChecklistsPage({ params }: PageProps<"/projets/[id]">) {
  const { id } = await params;
  const { project, role } = await requireProject(Number(id));
  const canEdit = can(role, "editor");

  const templates = await getChecklistTemplates();
  const lists = await db.select().from(checklists).where(eq(checklists.projectId, project.id)).orderBy(asc(checklists.position), asc(checklists.id));
  const items = lists.length
    ? await db.select().from(checklistItems).where(inArray(checklistItems.checklistId, lists.map((l) => l.id))).orderBy(asc(checklistItems.position), asc(checklistItems.id))
    : [];
  const byList = Map.groupBy(items, (i) => i.checklistId);

  return (
    <div className="space-y-5">
      {lists.length === 0 && (
        <p className="text-sm text-muted">
          Aucune checklist.{canEdit ? " Pars d'un modèle (montage, balances, démontage, sécurité) ou crée la tienne." : ""}
        </p>
      )}

      {lists.map((l) => {
        const its = byList.get(l.id) ?? [];
        const done = its.filter((i) => i.done).length;
        return (
          <section key={l.id} className="card space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="flex-1 font-semibold">{l.title}</h2>
              <span className="text-xs tabular-nums text-muted">{done}/{its.length}</span>
              {canEdit && (
                <form action={deleteChecklist}>
                  <input type="hidden" name="checklistId" value={l.id} />
                  <button className="text-muted hover:text-danger" aria-label={`Supprimer la checklist ${l.title}`}><Trash2 size={16} /></button>
                </form>
              )}
            </div>
            {its.length > 0 && (
              <div className="h-1.5 overflow-hidden rounded-full bg-line">
                <div className="h-full bg-accent transition-all" style={{ width: `${(done / its.length) * 100}%` }} />
              </div>
            )}
            <ul className="divide-y divide-line">
              {its.map((i) => (
                <ChecklistItemRow key={i.id} id={i.id} label={i.label} done={i.done} canEdit={canEdit} />
              ))}
            </ul>
            {canEdit && (
              <form action={addItem} className="flex gap-2 pt-1">
                <input type="hidden" name="checklistId" value={l.id} />
                <input name="label" required maxLength={255} placeholder="Ajouter un élément…" aria-label="Nouvel élément" className="input" />
                <button className="btn-ghost shrink-0">Ajouter</button>
              </form>
            )}
          </section>
        );
      })}

      {canEdit && (
        <section className="card space-y-4">
          <h2 className="font-semibold">Ajouter une checklist</h2>
          <form action={addChecklist} className="flex flex-wrap gap-2">
            <input type="hidden" name="projectId" value={project.id} />
            <select name="template" defaultValue="" aria-label="Modèle" className="input w-auto">
              <option value="">Checklist vide…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>Modèle : {t.title}</option>
              ))}
            </select>
            <input name="title" placeholder="Titre (si checklist vide)" aria-label="Titre" className="input min-w-48 flex-1" />
            <button className="btn">Ajouter</button>
          </form>
        </section>
      )}
    </div>
  );
}
