import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cues } from "@/db/schema";
import { requireProject } from "@/lib/projects";
import { CATEGORY_LABEL } from "@/lib/time";
import { ShowMode } from "@/components/ShowMode";
import { ProjectDownloads } from "@/components/ProjectDownloads";

export const metadata = { title: "Mode Jour J" };

export default async function ShowModePage({ params }: PageProps<"/projets/[id]/jour-j">) {
  const { id } = await params;
  const { project } = await requireProject(Number(id));
  const list = await db.select().from(cues).where(eq(cues.projectId, project.id)).orderBy(asc(cues.position), asc(cues.id));
  if (list.length === 0) {
    return (
      <div className="space-y-5">
        <section className="card space-y-2">
          <h2 className="font-semibold">Le mode Jour J a besoin d&apos;une conduite</h2>
          <p className="text-sm text-muted">Ajoute d&apos;abord les cues du spectacle (noir, musique, entrée…) : le mode Jour J les déroule ensuite une par une, avec un bouton GO et un chronomètre.</p>
          <Link href={`/projets/${project.id}/conduite`} className="btn w-fit">Créer la conduite</Link>
        </section>
        <ProjectDownloads projectId={project.id} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
    <ShowMode
      projectId={project.id}
      projectName={project.name}
      cues={list.map((c, i) => ({
        id: c.id,
        label: c.number ?? String(i + 1),
        title: c.title,
        category: CATEGORY_LABEL[c.category],
        durationSec: c.durationSec,
        notes: c.notes,
      }))}
    />
    <ProjectDownloads projectId={project.id} />
    </div>
  );
}
