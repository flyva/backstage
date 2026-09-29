import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, wikiPages, wikiRevisions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { restoreRevision } from "@/lib/wiki-actions";

export const metadata = { title: "Historique de la page" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "medium", timeStyle: "short" });

export default async function WikiHistoryPage({ params }: PageProps<"/wiki/[slug]/historique">) {
  await requireUser();
  const { slug } = await params;
  const [page] = await db.select().from(wikiPages).where(eq(wikiPages.slug, slug)).limit(1);
  if (!page) notFound();

  const revisions = await db
    .select({ rev: wikiRevisions, editor: users.name })
    .from(wikiRevisions)
    .innerJoin(users, eq(users.id, wikiRevisions.editorId))
    .where(eq(wikiRevisions.pageId, page.id))
    .orderBy(desc(wikiRevisions.createdAt), desc(wikiRevisions.id))
    .limit(50);

  return (
    <div className="max-w-3xl space-y-4">
      <Link href={`/wiki/${page.slug}`} className="text-sm text-muted hover:text-fg">← {page.title}</Link>
      <h1 className="text-2xl font-bold">Historique</h1>
      <ul className="space-y-2">
        {revisions.map(({ rev, editor }, i) => (
          <li key={rev.id} className="card space-y-1 p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{dateFmt.format(rev.createdAt)}</span>
              <span className="text-muted">par {editor}</span>
              {i === 0 && <span className="rounded-md border border-accent px-1.5 py-0.5 text-xs text-accent">Version actuelle</span>}
              <span className="ml-auto text-xs text-muted">{rev.body.length} caractères</span>
            </div>
            <details>
              <summary className="cursor-pointer text-xs text-muted hover:text-fg">Voir le contenu</summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-bg p-2 text-xs">{rev.body}</pre>
            </details>
            {i > 0 && (
              <form action={restoreRevision}>
                <input type="hidden" name="revisionId" value={rev.id} />
                <button className="btn-ghost text-xs">Restaurer cette version</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
