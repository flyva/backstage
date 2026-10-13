import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ticketFiles, tickets } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { TICKET_FILE_NAME, ticketFilesDir } from "@/lib/ticket-files";

export async function GET(_: Request, ctx: { params: Promise<{ id: string; fileId: string }> }) {
  const user = await getUser();
  if (!user) return new Response("Non autorisé", { status: 401 });
  const { id, fileId } = await ctx.params;
  const ticketId = Number(id);
  const fid = Number(fileId);
  if (!Number.isInteger(ticketId) || !Number.isInteger(fid)) return new Response("Introuvable", { status: 404 });

  // Visible uniquement par l'auteur du ticket ou un administrateur.
  const [ticket] = await db.select({ createdBy: tickets.createdBy }).from(tickets).where(eq(tickets.id, ticketId)).limit(1);
  if (!ticket || (ticket.createdBy !== user.id && !user.perms.administration)) return new Response("Introuvable", { status: 404 });

  const [row] = await db.select().from(ticketFiles).where(and(eq(ticketFiles.id, fid), eq(ticketFiles.ticketId, ticketId))).limit(1);
  if (!row || !TICKET_FILE_NAME.test(row.file)) return new Response("Introuvable", { status: 404 });

  const data = await readFile(path.join(ticketFilesDir(), row.file)).catch(() => null);
  if (!data) return new Response("Introuvable", { status: 404 });
  const safeName = row.originalName.replace(/["\r\n]/g, "_");
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": row.mime,
      "Content-Disposition": `${row.mime === "application/octet-stream" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      "X-Content-Type-Options": "nosniff",
      ...(row.mime === "application/pdf" ? {} : { "Content-Security-Policy": "sandbox; default-src 'none'" }),
      "Cache-Control": "private, no-store",
    },
  });
}
