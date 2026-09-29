import Link from "next/link";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { CalendarDays, Users } from "lucide-react";
import { db } from "@/db";
import { checklistItems, checklists, projectMembers, projects } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/projects";
import { CreateProjectForm } from "@/components/project-forms";

export const metadata = { title: "Projets" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });

export default async function ProjetsPage() {
  const user = await requireUser();
  const mine = await db
    .select({ project: projects, role: projectMembers.role })
    .from(projectMembers)
    .innerJoin(projects, eq(projects.id, projectMembers.projectId))
    .where(eq(projectMembers.userId, user.id))
    .orderBy(desc(projects.createdAt));

  const ids = mine.map((m) => m.project.id);
  const [memberCounts, progress] = ids.length
    ? await Promise.all([
        db
          .select({ projectId: projectMembers.projectId, n: sql<number>`count(*)` })
          .from(projectMembers)
          .where(inArray(projectMembers.projectId, ids))
          .groupBy(projectMembers.projectId),
        db
          .select({
            projectId: checklists.projectId,
            total: sql<number>`count(${checklistItems.id})`,
            done: sql<number>`coalesce(sum(${checklistItems.done}), 0)`,
          })
          .from(checklists)
          .leftJoin(checklistItems, eq(checklistItems.checklistId, checklists.id))
          .where(inArray(checklists.projectId, ids))
          .groupBy(checklists.projectId),
      ])
    : [[], []];
  const members = new Map(memberCounts.map((r) => [r.projectId, Number(r.n)]));
  const prog = new Map(progress.map((r) => [r.projectId, { total: Number(r.total), done: Number(r.done) }]));

  return (
    <div className="max-w-4xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Projets</h1>
        <p className="text-sm text-muted">Un espace par spectacle, évènement ou mission : équipe, checklists et bientôt conduite et fiches techniques.</p>
      </header>

      {mine.length === 0 ? (
        <p className="text-sm text-muted">Tu n&apos;as encore aucun projet. Crée le premier ci-dessous.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {mine.map(({ project: p, role }) => {
            const pr = prog.get(p.id);
            const pct = pr && pr.total > 0 ? Math.round((pr.done / pr.total) * 100) : null;
            return (
              <Link key={p.id} href={`/projets/${p.id}`} className="card space-y-2 hover:border-accent">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold leading-snug">{p.name}</h2>
                  <span className="shrink-0 rounded-md border border-line px-1.5 py-0.5 text-xs text-muted">{ROLE_LABEL[role]}</span>
                </div>
                {p.description && <p className="line-clamp-2 text-sm text-muted">{p.description}</p>}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                  {p.eventDate && <span className="flex items-center gap-1"><CalendarDays size={12} /> {dateFmt.format(new Date(p.eventDate))}</span>}
                  <span className="flex items-center gap-1"><Users size={12} /> {members.get(p.id) ?? 1}</span>
                </div>
                {pct !== null && (
                  <div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-line">
                      <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-1 text-xs text-muted">{pr!.done}/{pr!.total} tâches ({pct} %)</div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      <section className="card space-y-3">
        <h2 className="font-semibold">Nouveau projet</h2>
        <CreateProjectForm />
      </section>
    </div>
  );
}
