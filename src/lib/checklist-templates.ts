import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { checklistTemplates, settings } from "@/db/schema";
import { CHECKLIST_TEMPLATES } from "@/lib/projects";

export const templateItems = (raw: string) => raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

/**
 * Modèles de checklists gérés par les admins. Au tout premier accès, les quatre modèles d'origine (montage, balances,
 * démontage, sécurité) sont copiés en base ; ensuite les admins peuvent tout modifier ou supprimer (même tout).
 */
export async function getChecklistTemplates() {
  const [flag] = await db.select().from(settings).where(eq(settings.key, "checklist_templates_seeded")).limit(1);
  if (!flag) {
    const existing = await db.select({ id: checklistTemplates.id }).from(checklistTemplates).limit(1);
    if (existing.length === 0) {
      await db.insert(checklistTemplates).values(
        Object.values(CHECKLIST_TEMPLATES).map((t, position) => ({ title: t.title, items: t.items.join("\n"), position })),
      );
    }
    await db.insert(settings).values({ key: "checklist_templates_seeded", value: "1" }).onDuplicateKeyUpdate({ set: { value: "1" } });
  }
  return db.select().from(checklistTemplates).orderBy(asc(checklistTemplates.position), asc(checklistTemplates.id));
}
