import { requireUser } from "@/lib/auth";
import { getPersonalProject } from "@/lib/projects";
import { ProjectKanbanView } from "@/components/ProjectKanbanView";

export const metadata = { title: "Mon kanban" };

// Kanban personnel : le même tableau que dans un projet (cartes, tâches, fichiers, vue tableau), mais que pour toi.
export default async function PersonalKanbanPage({ searchParams }: PageProps<"/kanban">) {
  const user = await requireUser();
  const { vue } = await searchParams;
  const project = await getPersonalProject(user.id);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Mon kanban</h1>
        <p className="text-sm text-muted">Tes tâches perso (cours, projets, rappels). Personne d&apos;autre n&apos;y a accès.</p>
      </div>
      <ProjectKanbanView user={user} project={project} role="owner" vue={vue} />
    </div>
  );
}
