import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { wikiPages } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { WikiEditor } from "@/components/WikiEditor";

export const metadata = { title: "Modifier la page" };

export default async function EditWikiPage({ params }: PageProps<"/wiki/[slug]/modifier">) {
  await requireUser();
  const { slug } = await params;
  const [page] = await db.select().from(wikiPages).where(eq(wikiPages.slug, slug)).limit(1);
  if (!page) notFound();
  const cats = await db.selectDistinct({ c: wikiPages.category }).from(wikiPages);

  return (
    <div className="max-w-3xl space-y-4">
      <Link href={`/wiki/${page.slug}`} className="text-sm text-muted hover:text-fg">← {page.title}</Link>
      <h1 className="text-2xl font-bold">Modifier la page</h1>
      <WikiEditor pageId={page.id} title={page.title} category={page.category} body={page.body} categories={cats.map((c) => c.c)} />
    </div>
  );
}
