import { desc } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { db } from "@/db";
import { updates } from "@/db/schema";
import { deleteUpdate } from "@/lib/update-actions";
import { ago } from "@/lib/relative-time";
import { UpdateForm } from "@/components/update-forms";

export const metadata = { title: "Nouveautés" };

export default async function AdminUpdatesPage() {
  const rows = await db.select().from(updates).orderBy(desc(updates.createdAt));
  return (
    <div className="max-w-2xl space-y-6">
      <section className="card space-y-3">
        <h2 className="font-semibold">Publier une nouveauté</h2>
        <p className="text-xs text-muted">Affichée discrètement dans la cloche de notifications de tout le monde, et listée sur <code>/nouveautes</code>.</p>
        <UpdateForm />
      </section>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">Aucune nouveauté publiée.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((u) => (
            <details key={u.id} className="card p-0">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 marker:hidden">
                <span className="min-w-0 flex-1 truncate font-medium">{u.title}</span>
                <span className="shrink-0 text-xs text-muted">{ago(u.createdAt)}</span>
              </summary>
              <div className="space-y-4 border-t border-line p-4">
                <UpdateForm id={u.id} title={u.title} body={u.body} />
                <form action={deleteUpdate} className="border-t border-line pt-3">
                  <input type="hidden" name="id" value={u.id} />
                  <button className="flex items-center gap-1 text-xs text-muted hover:text-danger"><Trash2 size={14} /> Supprimer</button>
                </form>
              </div>
            </details>
          ))}
        </ul>
      )}
    </div>
  );
}
