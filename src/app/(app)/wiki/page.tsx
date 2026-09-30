import Link from "next/link";
import { asc, or, sql } from "drizzle-orm";
import { FilePlus2, Search } from "lucide-react";
import { db } from "@/db";
import { wikiPages } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Wiki" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" });

/** Extrait de ~140 caractères autour de la première occurrence de la recherche. */
function snippet(body: string, q: string) {
  const plain = body.replace(/[#*_`>\[\]]/g, "").replace(/\s+/g, " ");
  const i = plain.toLowerCase().indexOf(q.toLowerCase());
  const start = Math.max(0, i - 50);
  return (start > 0 ? "…" : "") + plain.slice(start, start + 140) + (plain.length > start + 140 ? "…" : "");
}

export default async function WikiIndexPage({ searchParams }: PageProps<"/wiki">) {
  await requireUser();
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 100);

  // Échappe % et _ pour que la recherche soit littérale.
  const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const pages = q
    ? await db.select().from(wikiPages).where(or(sql`${wikiPages.title} like ${like}`, sql`${wikiPages.body} like ${like}`)).orderBy(asc(wikiPages.title)).limit(50)
    : await db.select().from(wikiPages).orderBy(asc(wikiPages.category), asc(wikiPages.title));
  const recent = q ? [] : [...pages].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 5);
  const groups = Map.groupBy(pages, (p) => p.category);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Wiki</h1>
          <p className="text-sm text-muted">Les ressources de la promo : fiches de cours, méthodes, tutos, contacts. Tout le monde peut contribuer.</p>
        </div>
        <Link href="/wiki/nouveau" className="btn"><FilePlus2 size={16} /> Nouvelle page</Link>
      </header>

      <form role="search" className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder="Rechercher dans le wiki…" aria-label="Rechercher" className="input pl-9" />
        </div>
        <button className="btn-ghost">Rechercher</button>
      </form>

      {pages.length === 0 && (
        <p className="text-sm text-muted">
          {q ? "Aucun résultat." : "Le wiki est vide."} <Link href="/wiki/nouveau" className="text-accent underline">Crée la première page</Link>.
        </p>
      )}

      {q ? (
        <ul className="space-y-2">
          {pages.map((p) => (
            <li key={p.id} className="card p-3">
              <Link href={`/wiki/${p.slug}`} className="font-medium hover:text-accent">{p.title}</Link>
              <span className="ml-2 text-xs text-muted">{p.category}</span>
              <p className="mt-1 text-xs text-muted">{snippet(p.body, q)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <>
          {recent.length > 0 && (
            <section className="card space-y-1">
              <h2 className="text-sm font-semibold">Modifiées récemment</h2>
              <ul className="text-sm">
                {recent.map((p) => (
                  <li key={p.id} className="flex items-baseline gap-2">
                    <Link href={`/wiki/${p.slug}`} className="text-accent hover:underline">{p.title}</Link>
                    <span className="text-xs text-muted">{dateFmt.format(p.updatedAt)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {[...groups].map(([category, list]) => (
            <section key={category} className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{category}</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {list.map((p) => (
                  <li key={p.id}>
                    <Link href={`/wiki/${p.slug}`} className="card block p-3 text-sm font-medium hover:border-accent">{p.title}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
