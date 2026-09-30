import { and, asc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { toLive } from "@/lib/message-bus";

// Solution de repli (sans flux en direct) : les messages arrivés après l'identifiant `after`.
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Non autorisé" }, { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return Response.json({ error: "Introuvable" }, { status: 404 });
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  if (!conv || (conv.buyerId !== user.id && conv.sellerId !== user.id)) return Response.json({ error: "Introuvable" }, { status: 404 });
  const after = Number(new URL(req.url).searchParams.get("after") ?? 0) || 0;
  const rows = await db.select().from(messages).where(and(eq(messages.conversationId, id), gt(messages.id, after))).orderBy(asc(messages.id));
  return Response.json({ messages: rows.map(toLive) }, { headers: { "Cache-Control": "no-store" } });
}
