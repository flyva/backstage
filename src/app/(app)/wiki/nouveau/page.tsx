import Link from "next/link";
import { db } from "@/db";
import { wikiPages } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { WikiEditor } from "@/components/WikiEditor";

export const metadata = { title: "Nouvelle page" };

export default async function NewWikiPage({ searchParams }: PageProps<"/wiki/nouveau">) {
  await requireUser();
  const sp = await searchParams;
  const titre = typeof sp.titre === "string" ? sp.titre.slice(0, 200) : "";
  const cats = await db.selectDistinct({ c: wikiPages.category }).from(wikiPages);

  return (
    <div className="space-y-4">
      <Link href="/wiki" className="text-sm text-muted hover:text-fg">← Wiki</Link>
      <h1 className="text-2xl font-bold">Nouvelle page</h1>
      <WikiEditor title={titre} categories={cats.map((c) => c.c)} />
    </div>
  );
}
