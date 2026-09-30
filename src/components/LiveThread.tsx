"use client";

import { useEffect, useRef, useState } from "react";
import { markConversationRead } from "@/lib/message-actions";
import type { LiveMessage } from "@/lib/message-bus";

const dayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Fil de la conversation en direct : les nouveaux messages arrivent par un flux (EventSource) sans recharger la page.
 * Si le flux est coupé (réseau, proxy), on interroge le serveur toutes les 4 s en attendant qu'il revienne.
 */
export function LiveThread({ conversationId, meId, initial }: { conversationId: number; meId: number; initial: LiveMessage[] }) {
  const [items, setItems] = useState<LiveMessage[]>(initial);
  const [live, setLive] = useState(false);
  const lastId = useRef(initial.at(-1)?.id ?? 0);
  const bottom = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  // Ajoute les messages nouveaux (sans doublon : le flux et la synchronisation peuvent livrer le même).
  const add = useRef((incoming: LiveMessage[]) => {
    setItems((cur) => {
      const known = new Set(cur.map((m) => m.id));
      const fresh = incoming.filter((m) => !known.has(m.id));
      if (fresh.length === 0) return cur;
      const next = [...cur, ...fresh].sort((a, b) => a.id - b.id);
      lastId.current = next.at(-1)!.id;
      return next;
    });
  });

  useEffect(() => {
    const read = () => { if (document.visibilityState === "visible") void markConversationRead(conversationId); };
    const sync = async () => {
      try {
        const res = await fetch(`/api/messages/${conversationId}/new?after=${lastId.current}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { messages: LiveMessage[] };
        if (data.messages.length) { add.current(data.messages); if (data.messages.some((m) => m.senderId !== meId)) read(); }
      } catch { /* hors ligne : on réessaie au prochain passage */ }
    };

    const es = new EventSource(`/api/messages/${conversationId}/stream?after=${lastId.current}`);
    es.onopen = () => setLive(true);
    es.addEventListener("message", (e) => {
      const m = JSON.parse((e as MessageEvent<string>).data) as LiveMessage;
      add.current([m]);
      if (m.senderId !== meId) read();
    });
    es.onerror = () => setLive(false);
    // Repli : tant que le flux n'est pas ouvert, on interroge le serveur.
    const poll = setInterval(() => { if (es.readyState !== EventSource.OPEN) void sync(); }, 4000);
    // Après l'envoi d'un message, on récupère tout de suite ce qui est arrivé.
    const onSync = () => void sync();
    window.addEventListener("conv-sync", onSync);
    document.addEventListener("visibilitychange", read);

    return () => { es.close(); clearInterval(poll); window.removeEventListener("conv-sync", onSync); document.removeEventListener("visibilitychange", read); };
  }, [conversationId, meId]);

  // Défilement vers le dernier message (sans animation à l'ouverture).
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: first.current ? "auto" : "smooth", block: "nearest" });
    first.current = false;
  }, [items.length]);

  return (
    <div>
      {items.length === 0 && <p className="text-sm text-muted">Aucun message.</p>}
      <ul className="max-h-[60vh] space-y-3 overflow-y-auto pr-1" aria-live="polite" data-live={live ? "on" : "off"}>
        {items.map((m) => {
          const mine = m.senderId === meId;
          return (
            <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-accent text-accent-fg" : "border border-line bg-bg"}`}>
                <p className="whitespace-pre-line break-words">{m.body}</p>
                <p className={`mt-1 text-[11px] ${mine ? "opacity-70" : "text-muted"}`}>{dayFmt.format(new Date(m.createdAt))}</p>
              </div>
            </li>
          );
        })}
        <div ref={bottom} />
      </ul>
      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
        <span className={`size-1.5 rounded-full ${live ? "bg-green-500" : "bg-muted"}`} aria-hidden /> {live ? "En direct" : "Connexion…"}
      </p>
    </div>
  );
}
