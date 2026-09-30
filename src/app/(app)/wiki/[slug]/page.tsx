import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowLeft, Download, FilePlus2, History, Pencil, Printer } from "lucide-react";
import { db } from "@/db";
import { users, wikiPages } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { deletePage } from "@/lib/wiki-actions";
import { Markdown } from "@/components/Markdown";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ancestors, childrenMap } from "@/lib/wiki";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" });

export async function generateMetadata({ params }: PageProps<"/wiki/[slug]">) {
  const { slug } = await params;
  const [p] = await db.select({ title: wikiPages.title }).from(wikiPages).where(eq(wikiPages.slug, slug)).limit(1);
  return { title: p?.title ?? "Wiki" };
}

export default async function WikiPage({ params }: PageProps<"/wiki/[slug]">) {
  const user = await requireUser();
  const { slug } = await params;
  const [row] = await db
    .select({ page: wikiPages, editor: users.name })
    .from(wikiPages)
    .innerJoin(users, eq(users.id, wikiPages.updatedBy))
    .where(eq(wikiPages.slug, slug))
    .limit(1);

  if (!row) {
    const title = slug.replace(/-/g, " ");
    return (
      <div className="max-w-2xl space-y-4">
        <Link href="/wiki" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> Wiki</Link>
        <h1 className="text-2xl font-bold">Cette page n&apos;existe pas encore</h1>
        <Link href={`/wiki/nouveau?titre=${encodeURIComponent(title)}`} className="btn w-fit">Créer « {title} »</Link>
      </div>
    );
  }

  const { page, editor } = row;
  const all = await db.select({ id: wikiPages.id, slug: wikiPages.slug, title: wikiPages.title, category: wikiPages.category, parentId: wikiPages.parentId }).from(wikiPages);
  const trail = ancestors(all, { id: page.id, slug: page.slug, title: page.title, category: page.category, parentId: page.parentId });
  const subpages = childrenMap(all).get(page.id) ?? [];
  return (
    <article className="space-y-4">
      <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1 text-sm text-muted">
        <Link href="/wiki" className="inline-flex items-center gap-1 hover:text-fg"><ArrowLeft size={14} /> Wiki</Link>
        {trail.map((a) => (
          <span key={a.id} className="flex items-center gap-1"><span aria-hidden>/</span><Link href={`/wiki/${a.slug}`} className="hover:text-fg">{a.title}</Link></span>
        ))}
      </nav>
      <header className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-muted">{page.category}</div>
        <h1 className="text-3xl font-bold">{page.title}</h1>
        <p className="text-xs text-muted">Modifiée le {dateFmt.format(page.updatedAt)} par {editor}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href={`/wiki/${page.slug}/modifier`} className="btn-ghost"><Pencil size={14} /> Modifier</Link>
          <Link href={`/wiki/${page.slug}/historique`} className="btn-ghost"><History size={14} /> Historique</Link>
          <Link href={`/wiki/nouveau?parent=${page.id}`} className="btn-ghost"><FilePlus2 size={14} /> Sous-page</Link>
          <Link href={`/wiki/${page.slug}/imprimer`} className="btn-ghost"><Printer size={14} /> PDF / Imprimer</Link>
          <a href={`/wiki/${page.slug}/export`} className="btn-ghost"><Download size={14} /> Markdown</a>
        </div>
      </header>
      <div className="card">
        {page.body.trim() ? <Markdown>{page.body}</Markdown> : <p className="text-sm text-muted">Cette page est vide.</p>}
      </div>
      {subpages.length > 0 && (
        <section className="card space-y-1">
          <h2 className="text-sm font-semibold">Sous-pages</h2>
          <ul className="text-sm">
            {subpages.map((c) => <li key={c.id}><Link href={`/wiki/${c.slug}`} className="text-accent hover:underline">{c.title}</Link></li>)}
          </ul>
        </section>
      )}
      {user.role === "admin" && (
        <form action={deletePage}>
          <input type="hidden" name="pageId" value={page.id} />
          <ConfirmButton message="Supprimer définitivement cette page et son historique ?" className="text-xs text-muted hover:text-danger">
            Supprimer la page (admin)
          </ConfirmButton>
        </form>
      )}
    </article>
  );
}
