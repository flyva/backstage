import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projectMembers, projects } from "@/db/schema";

/** Projets (hors kanban personnel) dont la personne est membre, sauf celui-ci : sources possibles pour copier des fiches. */
export async function listSourceProjects(userId: number, excludeId: number) {
  const rows = await db
    .select({ id: projects.id, name: projects.name, personalOf: projects.personalOf })
    .from(projectMembers)
    .innerJoin(projects, eq(projects.id, projectMembers.projectId))
    .where(eq(projectMembers.userId, userId));
  return rows.filter((r) => r.personalOf === null && r.id !== excludeId);
}
