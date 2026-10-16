import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { projectMembers } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { onPower } from "@/lib/power-bus";

// Flux en direct (Server-Sent Events) de la Charge électrique d'un projet : prévient les personnes qui l'ont ouverte
// dès qu'une ligne ou un appareil change (par elles ou par quelqu'un d'autre), pour qu'elles se mettent à jour sans recharger.
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return new Response("Non autorisé", { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response("Introuvable", { status: 404 });
  const [member] = await db.select({ u: projectMembers.userId }).from(projectMembers).where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, user.id))).limit(1);
  if (!member) return new Response("Introuvable", { status: 404 });

  const enc = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const write = (chunk: string) => { if (!closed) controller.enqueue(enc.encode(chunk)); };
      write("retry: 2000\n\n");
      const off = onPower(id, () => write(`event: changed\ndata: 1\n\n`));
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
    },
    cancel() { cleanup(); },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
