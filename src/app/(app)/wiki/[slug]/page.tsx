import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowLeft, History, Pencil } from "lucide-react";
import { db } from "@/db";
import { users, wikiPages } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { deletePage } from "@/lib/wiki-actions";
import { Markdown } from "@/components/Markdown";
import { ConfirmButton } from "@/components/ConfirmButton";

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
  return (
    <article className="max-w-3xl space-y-4">
      <Link href="/wiki" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> Wiki</Link>
      <header className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-muted">{page.category}</div>
        <h1 className="text-3xl font-bold">{page.title}</h1>
        <p className="text-xs text-muted">Modifiée le {dateFmt.format(page.updatedAt)} par {editor}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href={`/wiki/${page.slug}/modifier`} className="btn-ghost"><Pencil size={14} /> Modifier</Link>
          <Link href={`/wiki/${page.slug}/historique`} className="btn-ghost"><History size={14} /> Historique</Link>
        </div>
      </header>
      <div className="card">
        {page.body.trim() ? <Markdown>{page.body}</Markdown> : <p className="text-sm text-muted">Cette page est vide.</p>}
      </div>
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
