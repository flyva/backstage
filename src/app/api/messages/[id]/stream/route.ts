import { and, asc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { onEvent, toLive, type LiveEvent } from "@/lib/message-bus";

// Flux en direct (Server-Sent Events) d'une conversation : nouveaux messages, « est en train d'écrire », « vu ».
// Réservé à ses deux participants.
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return new Response("Non autorisé", { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response("Introuvable", { status: 404 });
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  if (!conv || (conv.buyerId !== user.id && conv.sellerId !== user.id)) return new Response("Introuvable", { status: 404 });

  // Reprise après une coupure : le navigateur renvoie le dernier identifiant reçu.
  const last = Number(req.headers.get("last-event-id") ?? new URL(req.url).searchParams.get("after") ?? 0) || 0;
  const enc = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const write = (chunk: string) => { if (!closed) controller.enqueue(enc.encode(chunk)); };
      const send = (e: LiveEvent) => {
        if (e.kind === "message") write(`id: ${e.message.id}\nevent: message\ndata: ${JSON.stringify(e.message)}\n\n`);
        else if (e.kind === "typing") write(`event: typing\ndata: ${JSON.stringify({ userId: e.userId })}\n\n`);
        else write(`event: read\ndata: ${JSON.stringify({ userId: e.userId, at: e.at })}\n\n`);
      };
      write("retry: 2000\n\n");
      const off = onEvent(id, send);
      // Un battement toutes les 20 s garde la connexion ouverte à travers Cloudflare et les box.
      const beat = setInterval(() => write(": ping\n\n"), 20000);
      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(beat);
        off();
        try { controller.close(); } catch { /* déjà fermé */ }
      };
      req.signal.addEventListener("abort", cleanup);
      for (const m of await db.select().from(messages).where(and(eq(messages.conversationId, id), gt(messages.id, last))).orderBy(asc(messages.id))) send({ kind: "message", message: toLive(m) });
    },
    cancel() { cleanup(); },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform", // « no-transform » : pas de compression, qui retiendrait les messages
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
