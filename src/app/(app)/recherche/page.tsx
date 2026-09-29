import Link from "next/link";
import { and, eq, or, sql } from "drizzle-orm";
import { BookOpen, Briefcase, CircleHelp, Link2, Newspaper, Package, Search, type LucideIcon } from "lucide-react";
import { db } from "@/db";
import { equipmentItems, faqItems, newsPosts, projectMembers, projects, usefulLinks, wikiPages } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Recherche" };

type Hit = { key: string; title: string; sub?: string; href: string; external?: boolean };
type Group = { title: string; icon: LucideIcon; hits: Hit[] };

const snippet = (text: string, q: string) => {
  const plain = text.replace(/[#*_`>\[\]|]/g, "").replace(/\s+/g, " ");
  const i = plain.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return plain.slice(0, 120);
  const start = Math.max(0, i - 40);
  return (start > 0 ? "…" : "") + plain.slice(start, start + 130) + (plain.length > start + 130 ? "…" : "");
};

export default async function SearchPage({ searchParams }: PageProps<"/recherche">) {
  const user = await requireUser();
  const q = String((await searchParams).q ?? "").trim().slice(0, 100);
  const groups: Group[] = [];

  if (q.length >= 2) {
    // Recherche littérale : % et _ sont échappés.
    const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    const [wiki, news, mine, gear, faq, links] = await Promise.all([
      db.select({ slug: wikiPages.slug, title: wikiPages.title, body: wikiPages.body }).from(wikiPages).where(or(sql`${wikiPages.title} like ${like}`, sql`${wikiPages.body} like ${like}`)).limit(8),
      db.select({ id: newsPosts.id, title: newsPosts.title, body: newsPosts.body }).from(newsPosts).where(or(sql`${newsPosts.title} like ${like}`, sql`${newsPosts.body} like ${like}`)).limit(8),
      // Seulement les projets dont la personne est membre.
      db
        .select({ id: projects.id, name: projects.name, description: projects.description })
        .from(projects)
        .innerJoin(projectMembers, and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, user.id)))
        .where(or(sql`${projects.name} like ${like}`, sql`${projects.description} like ${like}`))
        .limit(8),
      db.select({ id: equipmentItems.id, name: equipmentItems.name, code: equipmentItems.code, category: equipmentItems.category }).from(equipmentItems).where(or(sql`${equipmentItems.name} like ${like}`, sql`${equipmentItems.code} like ${like}`)).limit(8),
      db.select({ id: faqItems.id, question: faqItems.question, answer: faqItems.answer }).from(faqItems).where(or(sql`${faqItems.question} like ${like}`, sql`${faqItems.answer} like ${like}`)).limit(8),
      db.select({ id: usefulLinks.id, label: usefulLinks.label, url: usefulLinks.url, description: usefulLinks.description }).from(usefulLinks).where(or(sql`${usefulLinks.label} like ${like}`, sql`${usefulLinks.description} like ${like}`)).limit(8),
    ]);

    const push = (title: string, icon: LucideIcon, hits: Hit[]) => hits.length && groups.push({ title, icon, hits });
    push("Wiki", BookOpen, wiki.map((w) => ({ key: `w${w.slug}`, title: w.title, sub: snippet(w.body, q), href: `/wiki/${w.slug}` })));
    push("Actualités", Newspaper, news.map((n) => ({ key: `n${n.id}`, title: n.title, sub: snippet(n.body, q), href: `/actus/${n.id}` })));
    push("Mes projets", Briefcase, mine.map((p) => ({ key: `p${p.id}`, title: p.name, sub: p.description ?? undefined, href: `/projets/${p.id}` })));
    push("Matériel", Package, gear.map((g) => ({ key: `g${g.id}`, title: g.name, sub: `${g.category}${g.code ? ` · ${g.code}` : ""}`, href: `/materiel/${g.id}` })));
    push("FAQ", CircleHelp, faq.map((f) => ({ key: `f${f.id}`, title: f.question, sub: snippet(f.answer, q), href: "/faq" })));
    push("Liens utiles", Link2, links.map((l) => ({ key: `l${l.id}`, title: l.label, sub: l.description ?? l.url, href: l.url, external: true })));
  }

  const total = groups.reduce((s, g) => s + g.hits.length, 0);

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Recherche</h1>
        <p className="text-sm text-muted">{q.length >= 2 ? `${total} résultat${total > 1 ? "s" : ""} pour « ${q} »` : "Tape au moins 2 caractères dans la barre du haut (Ctrl K)."}</p>
      </header>

      <form role="search" className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={q} placeholder="Wiki, actus, projets, matériel, FAQ…" aria-label="Rechercher" className="input pl-9" />
      </form>

      {q.length >= 2 && total === 0 && <p className="text-sm text-muted">Aucun résultat.</p>}

      {groups.map(({ title, icon: Icon, hits }) => (
        <section key={title} className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted"><Icon size={15} /> {title}</h2>
          <ul className="space-y-2">
            {hits.map((h) => (
              <li key={h.key} className="card p-3">
                {h.external ? (
                  <a href={h.href} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-accent">{h.title}</a>
                ) : (
                  <Link href={h.href} className="font-medium hover:text-accent">{h.title}</Link>
                )}
                {h.sub && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{h.sub}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
