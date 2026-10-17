import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messageAttachments, messages } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { MESSAGE_FILE_NAME, messageFilesDir } from "@/lib/message-files";
import { isParticipant } from "@/lib/messaging";

export async function GET(_: Request, ctx: { params: Promise<{ id: string; fileId: string }> }) {
  const user = await getUser();
  if (!user) return new Response("Non autorisé", { status: 401 });
  const { id, fileId } = await ctx.params;
  const conversationId = Number(id);
  const fid = Number(fileId);
  if (!Number.isInteger(conversationId) || !Number.isInteger(fid)) return new Response("Introuvable", { status: 404 });

  // Visible uniquement par les participantes de la conversation.
  const [conv] = await db.select({ id: conversations.id, kind: conversations.kind, buyerId: conversations.buyerId, sellerId: conversations.sellerId }).from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!conv || !(await isParticipant(conv, user.id))) return new Response("Introuvable", { status: 404 });

  const [row] = await db
    .select({ file: messageAttachments.file, originalName: messageAttachments.originalName, mime: messageAttachments.mime })
    .from(messageAttachments)
    .innerJoin(messages, eq(messages.id, messageAttachments.messageId))
    .where(and(eq(messageAttachments.id, fid), eq(messages.conversationId, conversationId)))
    .limit(1);
  if (!row || !MESSAGE_FILE_NAME.test(row.file)) return new Response("Introuvable", { status: 404 });

  const data = await readFile(path.join(messageFilesDir(), row.file)).catch(() => null);
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
