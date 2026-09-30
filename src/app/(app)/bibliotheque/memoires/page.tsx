import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { db } from "@/db";
import { consoleMemories, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { deleteMemory } from "@/lib/library-actions";
import { MemoryForm } from "@/components/library-forms";
import { Markdown } from "@/components/Markdown";

export const metadata = { title: "Mémoires et scènes" };

export default async function MemoriesPage({ searchParams }: PageProps<"/bibliotheque/memoires">) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().toLowerCase().slice(0, 80);
  const console_ = typeof sp.console === "string" ? sp.console : "";

  const rows = await db
    .select({ m: consoleMemories, author: users.name })
    .from(consoleMemories)
    .innerJoin(users, eq(users.id, consoleMemories.createdBy))
    .orderBy(desc(consoleMemories.updatedAt));
  const consoles = [...new Set(rows.map((r) => r.m.console).filter((c): c is string => !!c))].sort();
  const list = rows.filter(({ m }) => (!console_ || m.console === console_) && (!q || `${m.title} ${m.number ?? ""} ${m.category ?? ""} ${m.tags ?? ""} ${m.notes ?? ""}`.toLowerCase().includes(q)));
  const canManage = (createdBy: number) => user.id === createdBy || user.role === "admin" || user.role === "materiel";

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">Le carnet de la promo pour les consoles (grandMA, ETC, Chamsys…) : mémoires, scènes, effets réutilisables, avec une capture d&apos;écran si besoin.</p>

      <section className="card space-y-3">
        <h2 className="font-semibold">Ajouter une mémoire</h2>
        <MemoryForm consoles={consoles} />
      </section>

      <section className="space-y-3">
        <form role="search" className="flex flex-wrap gap-2">
          <input name="q" defaultValue={q} placeholder="Rechercher…" aria-label="Rechercher" className="input max-w-xs" />
          <select name="console" defaultValue={console_} aria-label="Console" className="input w-auto">
            <option value="">Toutes les consoles</option>
            {consoles.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn-ghost">Filtrer</button>
          {(q || console_) && <Link href="/bibliotheque/memoires" className="btn-ghost">Effacer</Link>}
        </form>
        <h2 className="font-semibold">Mémoires ({list.length})</h2>
        {list.length === 0 && <p className="text-sm text-muted">Aucune mémoire.</p>}
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map(({ m, author }) => (
            <article key={m.id} className="card space-y-2">
              <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="min-w-0 flex-1 font-semibold">{m.title}</h3>
                {m.number && <span className="font-mono text-sm text-accent">{m.number}</span>}
              </header>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {m.console && <span className="rounded-full border border-line px-2 py-0.5">{m.console}</span>}
                {m.category && <span className="rounded-full border border-line px-2 py-0.5 text-muted">{m.category}</span>}
                {m.tags?.split(",").map((t) => <span key={t} className="rounded-full bg-accent/15 px-2 py-0.5">{t}</span>)}
              </div>
              {m.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/wiki/files/${m.image}`} alt={`Capture : ${m.title}`} loading="lazy" className="max-h-64 rounded-lg border border-line" />
              )}
              {m.notes && <div className="text-sm"><Markdown breaks>{m.notes}</Markdown></div>}
              <p className="text-xs text-muted">Par {author}</p>
              {canManage(m.createdBy) && (
                <details>
                  <summary className="cursor-pointer text-xs text-muted hover:text-fg">Modifier</summary>
                  <div className="space-y-3 pt-3">
                    <MemoryForm id={m.id} title={m.title} console={m.console ?? ""} number={m.number ?? ""} category={m.category ?? ""} notes={m.notes ?? ""} tags={m.tags ?? ""} image={m.image ?? ""} consoles={consoles} />
                    <form action={deleteMemory} className="border-t border-line pt-3">
                      <input type="hidden" name="id" value={m.id} />
                      <button className="flex items-center gap-1 text-xs text-muted hover:text-danger"><Trash2 size={14} /> Supprimer</button>
                    </form>
                  </div>
                </details>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
