import { writeFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { kanbanCards, kanbanColumns, projectFiles, projectMembers } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { sameOrigin } from "@/lib/gallery";
import { can } from "@/lib/projects";
import {
  ensureProjectFilesDir, MAX_PROJECT_FILE_BYTES, MAX_PROJECT_TOTAL_BYTES, newProjectFileName, projectFilesDir, projectFilesUsage, sniff,
} from "@/lib/project-files";

const json = (body: object, status = 200) => Response.json(body, { status });

// Réponses JSON (et non pages d'erreur) : c'est appelé par fetch depuis le formulaire d'envoi.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return json({ error: "Origine refusée" }, 403);
  const user = await getUser();
  if (!user) return json({ error: "Non connecté" }, 401);

  const projectId = Number((await ctx.params).id);
  if (!Number.isInteger(projectId)) return json({ error: "Projet introuvable" }, 404);
  const [m] = await db
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)))
    .limit(1);
  if (!m) return json({ error: "Projet introuvable" }, 404);
  if (!can(m.role, "editor")) return json({ error: "Droits insuffisants" }, 403);

  if (Number(req.headers.get("content-length") ?? 0) > MAX_PROJECT_FILE_BYTES + 100_000) return json({ error: "Fichier trop lourd (15 Mo max)" }, 413);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return json({ error: "Requête invalide" }, 400);
  if (file.size === 0 || file.size > MAX_PROJECT_FILE_BYTES) return json({ error: "Fichier vide ou trop lourd (15 Mo max)" }, 413);

  // Pièce jointe d'une carte kanban : la carte doit appartenir à ce projet.
  const rawCard = form?.get("cardId");
  let cardId: number | null = null;
  if (typeof rawCard === "string" && rawCard !== "") {
    cardId = Number(rawCard);
    const [c] = Number.isInteger(cardId)
      ? await db.select({ id: kanbanCards.id }).from(kanbanCards).innerJoin(kanbanColumns, eq(kanbanColumns.id, kanbanCards.columnId)).where(and(eq(kanbanCards.id, cardId), eq(kanbanColumns.projectId, projectId))).limit(1)
      : [];
    if (!c) return json({ error: "Carte introuvable" }, 404);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) return json({ error: "Format non supporté (PDF, JPEG, PNG, Word, Excel, PowerPoint ou ZIP)" }, 415);
  if ((await projectFilesUsage()) + bytes.length > MAX_PROJECT_TOTAL_BYTES) return json({ error: "Espace de stockage plein" }, 507);

  await ensureProjectFilesDir();
  const name = newProjectFileName(kind.ext);
  await writeFile(path.join(projectFilesDir(), name), bytes);
  // Le nom d'origine n'est gardé que pour l'affichage (nettoyé) ; le fichier stocké porte un nom aléatoire.
  const original = file.name.replace(/[\u0000-\u001f\\/]/g, "_").slice(0, 200) || `fichier.${kind.ext}`;
  await db.insert(projectFiles).values({ projectId, cardId, file: name, originalName: original, mime: kind.mime, size: bytes.length, uploadedBy: user.id });
  return json({ ok: true });
}
