import { asc } from "drizzle-orm";
import { db } from "@/db";
import { wikiPages } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { WikiSidebar } from "@/components/WikiSidebar";

export default async function WikiLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const pages = await db
    .select({ id: wikiPages.id, slug: wikiPages.slug, title: wikiPages.title, category: wikiPages.category, parentId: wikiPages.parentId })
    .from(wikiPages)
    .orderBy(asc(wikiPages.category), asc(wikiPages.title));
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <WikiSidebar pages={pages} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
