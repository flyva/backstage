"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CheckCheck } from "lucide-react";
import { markConversationRead } from "@/lib/message-actions";
import type { LiveMessage } from "@/lib/message-bus";

const dayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
const TYPING_MS = 4000; // « écrit… » disparaît 4 s après le dernier signal

/**
 * Fil de la conversation en direct : les nouveaux messages arrivent par un flux (EventSource) sans recharger la page, avec
 * l'indication « est en train d'écrire » et « Vu » sous ton dernier message. Si le flux est coupé (réseau, proxy), on interroge
 * le serveur toutes les 4 s en attendant qu'il revienne.
 */
export function LiveThread({ conversationId, meId, otherName, otherReadAt, initial }: {
  conversationId: number; meId: number; otherName: string; otherReadAt: string | null; initial: LiveMessage[];
}) {
  const [items, setItems] = useState<LiveMessage[]>(initial);
  const [live, setLive] = useState(false);
  const [typing, setTyping] = useState(false);
  const [readAt, setReadAt] = useState<string | null>(otherReadAt);
  const lastId = useRef(initial.at(-1)?.id ?? 0);
  const [openedAtId] = useState(initial.at(-1)?.id ?? 0); // les messages plus récents que l'ouverture arrivent avec une animation
  const bottom = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (m.senderId !== meId) { setTyping(false); read(); }
    });
    es.addEventListener("typing", (e) => {
      const { userId } = JSON.parse((e as MessageEvent<string>).data) as { userId: number };
      if (userId === meId) return;
      setTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), TYPING_MS);
    });
    es.addEventListener("read", (e) => {
      const { userId, at } = JSON.parse((e as MessageEvent<string>).data) as { userId: number; at: string };
      if (userId !== meId) setReadAt(at);
    });
    es.onerror = () => setLive(false);
    // Repli : tant que le flux n'est pas ouvert, on interroge le serveur.
    const poll = setInterval(() => { if (es.readyState !== EventSource.OPEN) void sync(); }, 4000);
    // Après l'envoi d'un message, on récupère tout de suite ce qui est arrivé.
    const onSync = () => void sync();
    window.addEventListener("conv-sync", onSync);
    document.addEventListener("visibilitychange", read);

    return () => {
      es.close(); clearInterval(poll); if (typingTimer.current) clearTimeout(typingTimer.current);
      window.removeEventListener("conv-sync", onSync); document.removeEventListener("visibilitychange", read);
    };
  }, [conversationId, meId]);

  // Défilement vers le dernier message (sans animation à l'ouverture), aussi quand « écrit… » apparaît.
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: first.current ? "auto" : "smooth", block: "nearest" });
    first.current = false;
  }, [items.length, typing]);

  // « Vu » : sous mon dernier message, une fois que l'autre personne a ouvert la conversation après son envoi.
  const lastMineId = [...items].reverse().find((m) => m.senderId === meId)?.id;

  return (
    <div>
      {items.length === 0 && <p className="text-sm text-muted">Aucun message.</p>}
      <ul className="max-h-[60vh] space-y-3 overflow-y-auto pr-1" aria-live="polite" data-live={live ? "on" : "off"}>
        {items.map((m) => {
          const mine = m.senderId === meId;
          const seen = mine && m.id === lastMineId && !!readAt && new Date(readAt).getTime() >= new Date(m.createdAt).getTime();
          return (
            <li key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"} ${m.id > openedAtId ? "anim-msg-in" : ""}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-accent text-accent-fg" : "border border-line bg-bg"}`}>
                <p className="whitespace-pre-line break-words">{m.body}</p>
                <p className={`mt-1 text-[11px] ${mine ? "opacity-70" : "text-muted"}`}>{dayFmt.format(new Date(m.createdAt))}</p>
              </div>
              {mine && m.id === lastMineId && (
                seen ? (
                  <span key="seen" className="anim-seen-in mt-0.5 flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400"><CheckCheck size={13} aria-hidden /> Vu à {timeFmt.format(new Date(readAt!))}</span>
                ) : (
                  <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted"><Check size={13} aria-hidden /> Envoyé</span>
                )
              )}
            </li>
          );
        })}
        {typing && (
          <li className="anim-msg-in flex items-center gap-2 text-muted" aria-label={`${otherName} est en train d'écrire`}>
            <span className="flex items-center gap-1 rounded-2xl border border-line bg-bg px-4 py-3" aria-hidden><i className="typing-dot" /><i className="typing-dot" /><i className="typing-dot" /></span>
            <span className="text-xs">{otherName} écrit…</span>
          </li>
        )}
        <div ref={bottom} />
      </ul>
      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
        <span className={`size-1.5 rounded-full ${live ? "bg-green-500" : "bg-muted"}`} aria-hidden /> {live ? "En direct" : "Connexion…"}
      </p>
    </div>
  );
}
