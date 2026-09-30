import { requireProject } from "@/lib/projects";
import { ProjectKanbanView } from "@/components/ProjectKanbanView";

export const metadata = { title: "Kanban" };

export default async function ProjectKanbanPage({ params, searchParams }: PageProps<"/projets/[id]/kanban">) {
  const { id } = await params;
  const { vue } = await searchParams;
  const { user, project, role } = await requireProject(Number(id));
  return <ProjectKanbanView user={user} project={project} role={role} vue={vue} />;
}
