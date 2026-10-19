import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { expenseFiles, expenseNotes } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { EXPENSE_FILE_NAME, expenseFilesDir } from "@/lib/expense-files";

// Photos supplémentaires d'une note (au-delà de la première, servie par /photo). Vérifie que la note appartient
// bien à la personne connectée avant de servir le fichier.
export async function GET(req: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const user = await getUser();
  if (!user) return new Response("Non autorisé", { status: 401 });
  const { id: idStr, fileId: fileIdStr } = await params;
  const id = Number(idStr);
  const fileId = Number(fileIdStr);
  if (!Number.isInteger(id) || !Number.isInteger(fileId)) return new Response("Introuvable", { status: 404 });

  const [note] = await db.select({ id: expenseNotes.id, date: expenseNotes.date }).from(expenseNotes).where(and(eq(expenseNotes.id, id), eq(expenseNotes.userId, user.id))).limit(1);
  if (!note) return new Response("Introuvable", { status: 404 });
  const [row] = await db.select({ fileName: expenseFiles.fileName }).from(expenseFiles).where(and(eq(expenseFiles.id, fileId), eq(expenseFiles.expenseNoteId, id))).limit(1);
  if (!row || !EXPENSE_FILE_NAME.test(row.fileName)) return new Response("Introuvable", { status: 404 });

  const data = await readFile(path.join(expenseFilesDir(), row.fileName)).catch(() => null);
  if (!data) return new Response("Introuvable", { status: 404 });
  const ext = row.fileName.endsWith(".png") ? "png" : "jpg";
  const download = new URL(req.url).searchParams.get("dl") === "1";
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": ext === "png" ? "image/png" : "image/jpeg",
      ...(download ? { "Content-Disposition": `attachment; filename="note-de-frais-${note.date}-${fileId}.${ext}"` } : {}),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
