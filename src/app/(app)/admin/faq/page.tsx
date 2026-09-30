import { asc } from "drizzle-orm";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { db } from "@/db";
import { faqItems } from "@/db/schema";
import { deleteFaq } from "@/lib/actions";
import { moveFaq } from "@/lib/config-actions";
import { FaqForm } from "@/components/config-forms";

export const metadata = { title: "Gérer la FAQ" };

export default async function AdminFaqPage() {
  const items = await db.select().from(faqItems).orderBy(asc(faqItems.category), asc(faqItems.position), asc(faqItems.id));
  const groups = Map.groupBy(items, (i) => i.category);
  const categories = [...groups.keys()];
  return (
    <div className="space-y-6">
      <section className="card space-y-3">
        <h2 className="font-semibold">Ajouter une question</h2>
        <FaqForm categories={categories} />
      </section>

      {[...groups].map(([category, list]) => (
        <section key={category} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{category} ({list.length})</h2>
          {list.map((f, i) => (
            <details key={f.id} className="card p-0">
              <summary className="cursor-pointer list-none px-4 py-3 font-medium marker:hidden">{f.question}</summary>
              <div className="space-y-4 border-t border-line p-4">
                <FaqForm id={f.id} category={f.category} question={f.question} answer={f.answer} categories={categories} />
                <div className="flex items-center gap-2 border-t border-line pt-3">
                  <form action={moveFaq}>
                    <input type="hidden" name="id" value={f.id} /><input type="hidden" name="dir" value="up" />
                    <button disabled={i === 0} className="btn-ghost text-xs disabled:opacity-40"><ArrowUp size={14} /> Monter</button>
                  </form>
                  <form action={moveFaq}>
                    <input type="hidden" name="id" value={f.id} /><input type="hidden" name="dir" value="down" />
                    <button disabled={i === list.length - 1} className="btn-ghost text-xs disabled:opacity-40"><ArrowDown size={14} /> Descendre</button>
                  </form>
                  <form action={deleteFaq} className="ml-auto">
                    <input type="hidden" name="id" value={f.id} />
                    <button className="flex items-center gap-1 text-xs text-muted hover:text-danger"><Trash2 size={14} /> Supprimer</button>
                  </form>
                </div>
              </div>
            </details>
          ))}
        </section>
      ))}
      {items.length === 0 && <p className="text-sm text-muted">Aucune question pour le moment.</p>}
    </div>
  );
}
