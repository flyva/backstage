import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { getChecklistTemplates, templateItems } from "@/lib/checklist-templates";
import { deleteTemplate, moveTemplate } from "@/lib/config-actions";
import { TemplateForm } from "@/components/config-forms";

export const metadata = { title: "Modèles de checklists" };

export default async function AdminChecklistsPage() {
  const templates = await getChecklistTemplates();
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Ces modèles sont proposés à la création d&apos;une checklist dans un projet (« Ajouter une checklist »). Modifier un modèle ne change pas les checklists déjà créées.
      </p>

      <section className="card space-y-3">
        <h2 className="font-semibold">Ajouter un modèle</h2>
        <TemplateForm />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Modèles ({templates.length})</h2>
        {templates.length === 0 && <p className="text-sm text-muted">Aucun modèle : les projets créent des checklists vides.</p>}
        {templates.map((t, i) => (
          <details key={t.id} className="card p-0">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 marker:hidden">
              <span className="min-w-0 flex-1 truncate font-medium">{t.title}</span>
              <span className="text-xs text-muted">{templateItems(t.items).length} éléments</span>
            </summary>
            <div className="space-y-4 border-t border-line p-4">
              <TemplateForm id={t.id} title={t.title} items={t.items} />
              <div className="flex items-center gap-2 border-t border-line pt-3">
                <form action={moveTemplate}>
                  <input type="hidden" name="id" value={t.id} /><input type="hidden" name="dir" value="up" />
                  <button disabled={i === 0} className="btn-ghost text-xs disabled:opacity-40"><ArrowUp size={14} /> Monter</button>
                </form>
                <form action={moveTemplate}>
                  <input type="hidden" name="id" value={t.id} /><input type="hidden" name="dir" value="down" />
                  <button disabled={i === templates.length - 1} className="btn-ghost text-xs disabled:opacity-40"><ArrowDown size={14} /> Descendre</button>
                </form>
                <form action={deleteTemplate} className="ml-auto">
                  <input type="hidden" name="id" value={t.id} />
                  <button className="flex items-center gap-1 text-xs text-muted hover:text-danger"><Trash2 size={14} /> Supprimer</button>
                </form>
              </div>
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
