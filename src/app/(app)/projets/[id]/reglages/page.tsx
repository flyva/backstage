import { requireProject } from "@/lib/projects";
import { deleteProject } from "@/lib/project-actions";
import { EditProjectForm } from "@/components/project-forms";
import { ConfirmButton } from "@/components/ConfirmButton";

export const metadata = { title: "Réglages du projet" };

export default async function ProjectSettingsPage({ params }: PageProps<"/projets/[id]/reglages">) {
  const { id } = await params;
  const { project } = await requireProject(Number(id), "owner");
  return (
    <div className="space-y-5">
      <section className="card space-y-3">
        <h2 className="font-semibold">Informations</h2>
        <EditProjectForm
          project={{
            id: project.id,
            name: project.name,
            description: project.description ?? "",
            eventDate: project.eventDate ?? "",
          }}
        />
      </section>

      <section className="card space-y-3 border-danger/50">
        <h2 className="font-semibold text-danger">Zone dangereuse</h2>
        <p className="text-sm text-muted">Supprime définitivement le projet, ses checklists et son équipe. Cette action est irréversible.</p>
        <form action={deleteProject}>
          <input type="hidden" name="projectId" value={project.id} />
          <ConfirmButton message="Supprimer définitivement ce projet ?" className="btn-ghost border-danger text-danger">Supprimer le projet</ConfirmButton>
        </form>
      </section>
    </div>
  );
}
