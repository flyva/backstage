import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowLeft, Download, GraduationCap, History, Pencil, Printer } from "lucide-react";
import { db } from "@/db";
import { users, wikiPages } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { COURSES } from "@/lib/course-data";
import { Markdown } from "@/components/Markdown";
import { ancestors, childrenMap } from "@/lib/wiki";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" });

// Contenu des cours (catégorie « Cours » du wiki), affiché ici plutôt que dans /wiki : les leçons sont une matière à
// part, pas un article de wiki parmi d'autres. Le stockage reste le même (wikiPages), mais la page n'existe pas sous /wiki.

export async function generateMetadata({ params }: PageProps<"/cours/lecon/[slug]">) {
  const { slug } = await params;
  const [p] = await db.select({ title: wikiPages.title }).from(wikiPages).where(and(eq(wikiPages.slug, slug), eq(wikiPages.category, "Cours"))).limit(1);
  return { title: p?.title ?? "Cours" };
}

export default async function LeconPage({ params }: PageProps<"/cours/lecon/[slug]">) {
  const user = await requireUser();
  const { slug } = await params;
  const [row] = await db
    .select({ page: wikiPages, editor: users.name })
    .from(wikiPages)
    .innerJoin(users, eq(users.id, wikiPages.updatedBy))
    .where(and(eq(wikiPages.slug, slug), eq(wikiPages.category, "Cours")))
    .limit(1);
  if (!row) notFound();

  const { page, editor } = row;
  const all = await db.select({ id: wikiPages.id, slug: wikiPages.slug, title: wikiPages.title, category: wikiPages.category, parentId: wikiPages.parentId }).from(wikiPages).where(eq(wikiPages.category, "Cours"));
  const trail = ancestors(all, { id: page.id, slug: page.slug, title: page.title, category: page.category, parentId: page.parentId });
  const subpages = childrenMap(all).get(page.id) ?? [];
  const course = COURSES.find((c) => c.pages.some((p) => p.slug === slug));

  return (
    <article className="space-y-4">
      <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1 text-sm text-muted">
        <Link href="/cours/lecon" className="inline-flex items-center gap-1 hover:text-fg"><ArrowLeft size={14} /> Cours</Link>
        {trail.map((a) => (
          <span key={a.id} className="flex items-center gap-1"><span aria-hidden>/</span><Link href={`/cours/lecon/${a.slug}`} className="hover:text-fg">{a.title}</Link></span>
        ))}
      </nav>
      <header className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-muted">Cours</div>
        <h1 className="text-3xl font-bold">{page.title}</h1>
        <p className="text-xs text-muted">Modifiée le {dateFmt.format(page.updatedAt)} par {editor}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {course && <Link href={`/quiz/${course.key}`} className="btn"><GraduationCap size={14} /> Passer le quiz</Link>}
          {user.perms.administration && <Link href={`/wiki/${page.slug}/modifier`} className="btn-ghost"><Pencil size={14} /> Modifier</Link>}
          <Link href={`/wiki/${page.slug}/historique`} className="btn-ghost"><History size={14} /> Historique</Link>
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
            {subpages.map((c) => <li key={c.id}><Link href={`/cours/lecon/${c.slug}`} className="text-accent hover:underline">{c.title}</Link></li>)}
          </ul>
        </section>
      )}
    </article>
  );
}
