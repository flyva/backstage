import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cues } from "@/db/schema";
import { requireProject } from "@/lib/projects";
import { CATEGORY_LABEL } from "@/lib/time";
import { ShowMode } from "@/components/ShowMode";

export const metadata = { title: "Mode Jour J" };

export default async function ShowModePage({ params }: PageProps<"/projets/[id]/jour-j">) {
  const { id } = await params;
  const { project } = await requireProject(Number(id));
  const list = await db.select().from(cues).where(eq(cues.projectId, project.id)).orderBy(asc(cues.position), asc(cues.id));
  if (list.length === 0) redirect(`/projets/${project.id}/conduite`);

  return (
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
  );
}
