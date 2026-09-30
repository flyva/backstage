import { Markdown } from "@/components/Markdown";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { requireProject, ROLE_LABEL } from "@/lib/projects";
import { ProjectTabs } from "@/components/ProjectTabs";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });

export default async function ProjectLayout({ children, params }: LayoutProps<"/projets/[id]">) {
  const { id } = await params;
  const { project, role } = await requireProject(Number(id));
  if (project.personalOf !== null) redirect("/kanban"); // le kanban personnel n'a ni checklists, ni conduite, ni équipe
  const tabs = [
    { slug: "", label: "Checklists" },
    { slug: "kanban", label: "Kanban" },
    { slug: "conduite", label: "Conduite" },
    { slug: "jour-j", label: "Jour J" },
    { slug: "fiches", label: "Fiches" },
    { slug: "planning", label: "Planning" },
    { slug: "charge", label: "Charge" },
    { slug: "membres", label: "Équipe" },
    ...(role === "owner" ? [{ slug: "reglages", label: "Réglages" }] : []),
  ];
  return (
    <div className="space-y-5">
      <Link href="/projets" className="print:hidden inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft size={14} /> Tous les projets
      </Link>
      <header className="space-y-1 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <span className="rounded-md border border-line px-1.5 py-0.5 text-xs text-muted">{ROLE_LABEL[role]}</span>
        </div>
        {project.eventDate && (
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <CalendarDays size={14} /> <span className="capitalize">{dateFmt.format(new Date(project.eventDate))}</span>
          </p>
        )}
        {project.description && <div className="text-sm text-muted"><Markdown breaks>{project.description}</Markdown></div>}
      </header>
      <div className="print:hidden"><ProjectTabs base={`/projets/${project.id}`} tabs={tabs} /></div>
      {children}
    </div>
  );
}
