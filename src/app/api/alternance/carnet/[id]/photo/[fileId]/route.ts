import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { workLogFiles, workLogs } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { WORK_LOG_FILE_NAME, workLogFilesDir } from "@/lib/work-log-files";

export async function GET(req: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const user = await getUser();
  if (!user) return new Response("Non autorisé", { status: 401 });
  const { id: idStr, fileId: fileIdStr } = await params;
  const id = Number(idStr);
  const fileId = Number(fileIdStr);
  if (!Number.isInteger(id) || !Number.isInteger(fileId)) return new Response("Introuvable", { status: 404 });

  const [log] = await db.select({ id: workLogs.id, day: workLogs.day }).from(workLogs).where(and(eq(workLogs.id, id), eq(workLogs.userId, user.id))).limit(1);
  if (!log) return new Response("Introuvable", { status: 404 });
  const [row] = await db.select({ fileName: workLogFiles.fileName }).from(workLogFiles).where(and(eq(workLogFiles.id, fileId), eq(workLogFiles.workLogId, id))).limit(1);
  if (!row || !WORK_LOG_FILE_NAME.test(row.fileName)) return new Response("Introuvable", { status: 404 });

  const data = await readFile(path.join(workLogFilesDir(), row.fileName)).catch(() => null);
  if (!data) return new Response("Introuvable", { status: 404 });
  const ext = row.fileName.endsWith(".png") ? "png" : "jpg";
  const download = new URL(req.url).searchParams.get("dl") === "1";
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": ext === "png" ? "image/png" : "image/jpeg",
      ...(download ? { "Content-Disposition": `attachment; filename="journal-${log.day}-${fileId}.${ext}"` } : {}),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
