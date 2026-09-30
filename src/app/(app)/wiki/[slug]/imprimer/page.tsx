import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { wikiPages } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { childrenMap, type TreePage } from "@/lib/wiki";
import { Markdown } from "@/components/Markdown";
import { PrintButton } from "@/components/PrintButton";

export const metadata = { title: "Imprimer la page" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long" });

// Page (et ses sous-pages) prête pour l'impression ou l'enregistrement en PDF depuis le navigateur.
export default async function PrintWikiPage({ params }: PageProps<"/wiki/[slug]/imprimer">) {
  await requireUser();
  const { slug } = await params;
  const pages = await db.select().from(wikiPages);
  const page = pages.find((p) => p.slug === slug);
  if (!page) notFound();

  const kids = childrenMap(pages as (typeof pages[number] & TreePage)[]);
  const flat: { p: typeof page; depth: number }[] = [];
  const seen = new Set<number>();
  const walk = (p: typeof page, depth: number) => {
    if (seen.has(p.id)) return;
    seen.add(p.id);
    flat.push({ p, depth });
    for (const c of kids.get(p.id) ?? []) walk(c as typeof page, depth + 1);
  };
  walk(page, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/wiki/${page.slug}`} className="text-sm text-muted hover:text-fg">← {page.title}</Link>
        <PrintButton />
      </div>
      {flat.map(({ p, depth }) => (
        <article key={p.id} className={`space-y-2 ${depth > 0 ? "break-before-page" : ""}`}>
          <p className="text-xs uppercase tracking-wide text-muted">{p.category}</p>
          <h1 className={depth === 0 ? "text-3xl font-bold" : "text-2xl font-bold"}>{p.title}</h1>
          <p className="text-xs text-muted">Modifiée le {dateFmt.format(p.updatedAt)}</p>
          {p.body.trim() ? <Markdown>{p.body}</Markdown> : <p className="text-sm text-muted">Cette page est vide.</p>}
        </article>
      ))}
    </div>
  );
}
