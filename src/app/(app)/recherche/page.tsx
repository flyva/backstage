import Link from "next/link";
import { and, eq, gte, isNull, or, sql } from "drizzle-orm";
import { BookOpen, Briefcase, Car, CircleHelp, Library, Link2, ListChecks, MessageSquare, NotebookPen, Paperclip, PartyPopper, Newspaper, Package, Search, SquareKanban, type LucideIcon } from "lucide-react";
import { db } from "@/db";
import {
  bdeEvents, checklistItems, checklists, consoleMemories, cues, equipmentItems, faqItems, fixtureModels, kanbanCards, kanbanColumns, kanbanComments, newsPosts,
  projectFiles, projectMembers, projects, rides, usefulLinks, wikiPages, workLogs,
} from "@/db/schema";
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
        .where(and(isNull(projects.personalOf), or(sql`${projects.name} like ${like}`, sql`${projects.description} like ${like}`)))
        .limit(8),
      db.select({ id: equipmentItems.id, name: equipmentItems.name, code: equipmentItems.code, category: equipmentItems.category }).from(equipmentItems).where(or(sql`${equipmentItems.name} like ${like}`, sql`${equipmentItems.code} like ${like}`)).limit(8),
      db.select({ id: faqItems.id, question: faqItems.question, answer: faqItems.answer }).from(faqItems).where(or(sql`${faqItems.question} like ${like}`, sql`${faqItems.answer} like ${like}`)).limit(8),
      db.select({ id: usefulLinks.id, label: usefulLinks.label, url: usefulLinks.url, description: usefulLinks.description }).from(usefulLinks).where(or(sql`${usefulLinks.label} like ${like}`, sql`${usefulLinks.description} like ${like}`)).limit(8),
    ]);

    // Recherche élargie : tâches, commentaires, fichiers, conduite, checklists (seulement dans MES projets), carnet perso, bibliothèque, BDE, covoiturage.
    const inMine = (projectId: typeof projects.id) => and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id));
    const kanbanHref = (personalOf: number | null, projectId: number) => (personalOf !== null ? "/kanban" : `/projets/${projectId}/kanban`);
    const [cards, comments, files, cueRows, checkRows, logs, fixtures, memories, events, rideRows] = await Promise.all([
      db
        .select({ id: kanbanCards.id, title: kanbanCards.title, description: kanbanCards.description, projectId: projects.id, personalOf: projects.personalOf, project: projects.name })
        .from(kanbanCards)
        .innerJoin(kanbanColumns, eq(kanbanColumns.id, kanbanCards.columnId))
        .innerJoin(projects, eq(projects.id, kanbanColumns.projectId))
        .innerJoin(projectMembers, inMine(projects.id))
        .where(or(sql`${kanbanCards.title} like ${like}`, sql`${kanbanCards.description} like ${like}`, sql`${kanbanCards.labels} like ${like}`))
        .limit(10),
      db
        .select({ id: kanbanComments.id, body: kanbanComments.body, card: kanbanCards.title, projectId: projects.id, personalOf: projects.personalOf })
        .from(kanbanComments)
        .innerJoin(kanbanCards, eq(kanbanCards.id, kanbanComments.cardId))
        .innerJoin(kanbanColumns, eq(kanbanColumns.id, kanbanCards.columnId))
        .innerJoin(projects, eq(projects.id, kanbanColumns.projectId))
        .innerJoin(projectMembers, inMine(projects.id))
        .where(sql`${kanbanComments.body} like ${like}`)
        .limit(8),
      db
        .select({ id: projectFiles.id, name: projectFiles.originalName, cardId: projectFiles.cardId, projectId: projects.id, personalOf: projects.personalOf, project: projects.name })
        .from(projectFiles)
        .innerJoin(projects, eq(projects.id, projectFiles.projectId))
        .innerJoin(projectMembers, inMine(projects.id))
        .where(sql`${projectFiles.originalName} like ${like}`)
        .limit(8),
      db
        .select({ id: cues.id, title: cues.title, notes: cues.notes, projectId: projects.id, project: projects.name })
        .from(cues)
        .innerJoin(projects, eq(projects.id, cues.projectId))
        .innerJoin(projectMembers, inMine(projects.id))
        .where(or(sql`${cues.title} like ${like}`, sql`${cues.notes} like ${like}`))
        .limit(8),
      db
        .select({ id: checklistItems.id, label: checklistItems.label, list: checklists.title, projectId: projects.id, project: projects.name })
        .from(checklistItems)
        .innerJoin(checklists, eq(checklists.id, checklistItems.checklistId))
        .innerJoin(projects, eq(projects.id, checklists.projectId))
        .innerJoin(projectMembers, inMine(projects.id))
        .where(sql`${checklistItems.label} like ${like}`)
        .limit(8),
      db.select({ id: workLogs.id, day: workLogs.day, mission: workLogs.mission }).from(workLogs).where(and(eq(workLogs.userId, user.id), or(sql`${workLogs.mission} like ${like}`, sql`${workLogs.skills} like ${like}`))).limit(8),
      db.select({ id: fixtureModels.id, name: fixtureModels.name, mode: fixtureModels.mode }).from(fixtureModels).where(or(sql`${fixtureModels.name} like ${like}`, sql`${fixtureModels.notes} like ${like}`)).limit(6),
      db
        .select({ id: consoleMemories.id, title: consoleMemories.title, console: consoleMemories.console, number: consoleMemories.number, notes: consoleMemories.notes })
        .from(consoleMemories)
        .where(or(sql`${consoleMemories.title} like ${like}`, sql`${consoleMemories.notes} like ${like}`, sql`${consoleMemories.tags} like ${like}`, sql`${consoleMemories.number} like ${like}`, sql`${consoleMemories.console} like ${like}`))
        .limit(8),
      db.select({ id: bdeEvents.id, title: bdeEvents.title, description: bdeEvents.description }).from(bdeEvents).where(or(sql`${bdeEvents.title} like ${like}`, sql`${bdeEvents.description} like ${like}`)).limit(6),
      db
        .select({ id: rides.id, title: rides.title, from: rides.fromPlace, to: rides.toPlace })
        .from(rides)
        .where(and(gte(rides.departsAt, new Date()), or(sql`${rides.title} like ${like}`, sql`${rides.fromPlace} like ${like}`, sql`${rides.toPlace} like ${like}`)))
        .limit(6),
    ]);

    const push = (title: string, icon: LucideIcon, hits: Hit[]) => hits.length && groups.push({ title, icon, hits });
    push("Tâches (kanban)", SquareKanban, cards.map((c) => ({ key: `c${c.id}`, title: c.title, sub: `${c.personalOf !== null ? "Mon kanban" : c.project}${c.description ? " · " + snippet(c.description, q) : ""}`, href: kanbanHref(c.personalOf, c.projectId) })));
    push("Commentaires", MessageSquare, comments.map((c) => ({ key: `cm${c.id}`, title: c.card, sub: snippet(c.body, q), href: kanbanHref(c.personalOf, c.projectId) })));
    push("Fichiers joints", Paperclip, files.map((f) => ({ key: `f${f.id}`, title: f.name, sub: f.personalOf !== null ? "Mon kanban" : f.project, href: f.cardId !== null ? kanbanHref(f.personalOf, f.projectId) : `/projets/${f.projectId}/fiches` })));
    push("Conduite", ListChecks, cueRows.map((c) => ({ key: `q${c.id}`, title: c.title, sub: `${c.project}${c.notes ? " · " + snippet(c.notes, q) : ""}`, href: `/projets/${c.projectId}/conduite` })));
    push("Checklists", ListChecks, checkRows.map((c) => ({ key: `ck${c.id}`, title: c.label, sub: `${c.project} · ${c.list}`, href: `/projets/${c.projectId}` })));
    push("Mon carnet de liaison", NotebookPen, logs.map((l) => ({ key: `lg${l.id}`, title: l.day, sub: snippet(l.mission, q), href: `/alternance/carnet?m=${l.day.slice(0, 7)}` })));
    push("Bibliothèque", Library, [
      ...fixtures.map((f) => ({ key: `fx${f.id}`, title: f.name, sub: f.mode ?? "Appareil", href: `/bibliotheque?q=${encodeURIComponent(f.name)}` })),
      ...memories.map((m) => ({ key: `mm${m.id}`, title: m.title, sub: [m.console, m.number].filter(Boolean).join(" · ") || (m.notes ? snippet(m.notes, q) : undefined), href: `/bibliotheque/memoires?q=${encodeURIComponent(m.title)}` })),
    ]);
    push("Évènements BDE", PartyPopper, events.map((e) => ({ key: `ev${e.id}`, title: e.title, sub: e.description ? snippet(e.description, q) : undefined, href: "/bde" })));
    push("Covoiturage", Car, rideRows.map((r) => ({ key: `rd${r.id}`, title: r.title, sub: `${r.from} → ${r.to}`, href: "/covoiturage" })));
    push("Wiki", BookOpen, wiki.map((w) => ({ key: `w${w.slug}`, title: w.title, sub: snippet(w.body, q), href: `/wiki/${w.slug}` })));
    push("Actualités", Newspaper, news.map((n) => ({ key: `n${n.id}`, title: n.title, sub: snippet(n.body, q), href: `/actus/${n.id}` })));
    push("Mes projets", Briefcase, mine.map((p) => ({ key: `p${p.id}`, title: p.name, sub: p.description ?? undefined, href: `/projets/${p.id}` })));
    push("Matériel", Package, gear.map((g) => ({ key: `g${g.id}`, title: g.name, sub: `${g.category}${g.code ? ` · ${g.code}` : ""}`, href: `/materiel/${g.id}` })));
    push("FAQ", CircleHelp, faq.map((f) => ({ key: `f${f.id}`, title: f.question, sub: snippet(f.answer, q), href: "/faq" })));
    push("Liens utiles", Link2, links.map((l) => ({ key: `l${l.id}`, title: l.label, sub: l.description ?? l.url, href: l.url, external: true })));
  }

  const total = groups.reduce((s, g) => s + g.hits.length, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Recherche</h1>
        <p className="text-sm text-muted">{q.length >= 2 ? `${total} résultat${total > 1 ? "s" : ""} pour « ${q} »` : "Tape au moins 2 caractères dans la barre du haut (Ctrl K)."}</p>
      </header>

      <form role="search" className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={q} placeholder="Wiki, tâches, projets, fichiers, bibliothèque, matériel, FAQ…" aria-label="Rechercher" className="input pl-9" />
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
