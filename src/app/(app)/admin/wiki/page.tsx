import Link from "next/link";
import { asc, count } from "drizzle-orm";
import { db } from "@/db";
import { wikiPages } from "@/db/schema";
import { RenameCategoryForm } from "@/components/config-forms";

export const metadata = { title: "Gérer le wiki" };

export default async function AdminWikiPage() {
  const cats = await db.select({ name: wikiPages.category, n: count() }).from(wikiPages).groupBy(wikiPages.category).orderBy(asc(wikiPages.category));
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Les pages du wiki s&apos;écrivent et se modifient depuis <Link href="/wiki" className="text-accent underline">le wiki</Link>. Ici, tu ranges les catégories : renomme-en une, ou donne à deux catégories le même nom pour les fusionner.
      </p>
      <section className="card space-y-3">
        <h2 className="font-semibold">Catégories ({cats.length})</h2>
        {cats.length === 0 && <p className="text-sm text-muted">Le wiki est vide pour le moment.</p>}
        <ul className="divide-y divide-line">
          {cats.map((c) => (
            <li key={c.name} className="flex flex-wrap items-center gap-3 py-2">
              <span className="w-24 shrink-0 text-xs text-muted">{c.n} page{c.n > 1 ? "s" : ""}</span>
              <div className="min-w-0 flex-1"><RenameCategoryForm name={c.name} /></div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
