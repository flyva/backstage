import { asc } from "drizzle-orm";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { db } from "@/db";
import { usefulLinks } from "@/db/schema";
import { deleteLink } from "@/lib/actions";
import { moveLink } from "@/lib/config-actions";
import { LinkForm } from "@/components/config-forms";

export const metadata = { title: "Gérer les liens utiles" };

export default async function AdminLinksPage() {
  const links = await db.select().from(usefulLinks).orderBy(asc(usefulLinks.category), asc(usefulLinks.position), asc(usefulLinks.id));
  const groups = Map.groupBy(links, (l) => l.category);
  const categories = [...groups.keys()];
  return (
    <div className="space-y-6">
      <section className="card space-y-3">
        <h2 className="font-semibold">Ajouter un lien</h2>
        <LinkForm categories={categories} />
      </section>

      {[...groups].map(([category, list]) => (
        <section key={category} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{category} ({list.length})</h2>
          {list.map((l, i) => (
            <details key={l.id} className="card p-0">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 marker:hidden">
                <span className="min-w-0 flex-1 truncate font-medium">{l.label}</span>
                <span className="hidden max-w-xs truncate text-xs text-muted sm:block">{l.url}</span>
              </summary>
              <div className="space-y-4 border-t border-line p-4">
                <LinkForm id={l.id} category={l.category} label={l.label} url={l.url} description={l.description ?? ""} categories={categories} />
                <div className="flex items-center gap-2 border-t border-line pt-3">
                  <form action={moveLink}>
                    <input type="hidden" name="id" value={l.id} /><input type="hidden" name="dir" value="up" />
                    <button disabled={i === 0} className="btn-ghost text-xs disabled:opacity-40"><ArrowUp size={14} /> Monter</button>
                  </form>
                  <form action={moveLink}>
                    <input type="hidden" name="id" value={l.id} /><input type="hidden" name="dir" value="down" />
                    <button disabled={i === list.length - 1} className="btn-ghost text-xs disabled:opacity-40"><ArrowDown size={14} /> Descendre</button>
                  </form>
                  <form action={deleteLink} className="ml-auto">
                    <input type="hidden" name="id" value={l.id} />
                    <button className="flex items-center gap-1 text-xs text-muted hover:text-danger"><Trash2 size={14} /> Supprimer</button>
                  </form>
                </div>
              </div>
            </details>
          ))}
        </section>
      ))}
      {links.length === 0 && <p className="text-sm text-muted">Aucun lien pour le moment.</p>}
    </div>
  );
}
