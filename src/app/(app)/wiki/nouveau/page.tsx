import Link from "next/link";
import { db } from "@/db";
import { wikiPages } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { WikiEditor } from "@/components/WikiEditor";
import { parentChoices } from "@/lib/wiki-tree";

export const metadata = { title: "Nouvelle page" };

export default async function NewWikiPage({ searchParams }: PageProps<"/wiki/nouveau">) {
  await requireUser();
  const sp = await searchParams;
  const titre = typeof sp.titre === "string" ? sp.titre.slice(0, 200) : "";
  const all = await db.select({ id: wikiPages.id, slug: wikiPages.slug, title: wikiPages.title, category: wikiPages.category, parentId: wikiPages.parentId }).from(wikiPages);
  const cats = [...new Set(all.map((p) => p.category))];
  const wanted = Number(typeof sp.parent === "string" ? sp.parent : 0);
  const parent = all.find((p) => p.id === wanted);

  return (
    <div className="space-y-4">
      <Link href="/wiki" className="text-sm text-muted hover:text-fg">← Wiki</Link>
      <h1 className="text-2xl font-bold">Nouvelle page</h1>
      <WikiEditor title={titre} category={parent?.category} categories={cats} parentId={parent?.id ?? null} parentOptions={parentChoices(all)} />
    </div>
  );
}
