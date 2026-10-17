import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { expenseNotes } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { EXPENSE_FILE_NAME, expenseFilesDir } from "@/lib/expense-files";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return new Response("Non autorisé", { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response("Introuvable", { status: 404 });

  const [row] = await db.select({ photoFile: expenseNotes.photoFile, date: expenseNotes.date }).from(expenseNotes).where(and(eq(expenseNotes.id, id), eq(expenseNotes.userId, user.id))).limit(1);
  if (!row || !EXPENSE_FILE_NAME.test(row.photoFile)) return new Response("Introuvable", { status: 404 });

  const data = await readFile(path.join(expenseFilesDir(), row.photoFile)).catch(() => null);
  if (!data) return new Response("Introuvable", { status: 404 });
  const ext = row.photoFile.endsWith(".png") ? "png" : "jpg";
  const download = new URL(req.url).searchParams.get("dl") === "1";
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": ext === "png" ? "image/png" : "image/jpeg",
      ...(download ? { "Content-Disposition": `attachment; filename="note-de-frais-${row.date}.${ext}"` } : {}),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
