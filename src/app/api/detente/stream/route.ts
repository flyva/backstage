import { getUser } from "@/lib/auth";
import { currentPlayers, onDetente, type DetenteEvent } from "@/lib/detente-bus";

// Flux en direct de l'espace détente (Server-Sent Events) : qui joue, qui arrive/part, et les scores en direct.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return new Response("Non autorisé", { status: 401 });

  const enc = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const write = (chunk: string) => { if (!closed) controller.enqueue(enc.encode(chunk)); };
      const send = (e: DetenteEvent) => {
        if (e.kind === "join") write(`event: join\ndata: ${JSON.stringify(e.player)}\n\n`);
        else if (e.kind === "leave") write(`event: leave\ndata: ${JSON.stringify({ userId: e.userId })}\n\n`);
        else write(`event: score\ndata: ${JSON.stringify(e.score)}\n\n`);
      };
      write("retry: 2000\n\n");
      write(`event: roster\ndata: ${JSON.stringify(currentPlayers())}\n\n`);
      const off = onDetente(send);
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
