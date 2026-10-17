"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CheckCheck, File as FileIcon, Reply } from "lucide-react";
import { markConversationRead, setConversationPresence } from "@/lib/message-actions";
import { MessageBody } from "@/components/MessageBody";
import type { LiveAttachment, LiveMessage } from "@/lib/message-bus";

const fileSize = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} Ko` : `${(n / (1024 * 1024)).toFixed(1)} Mo`);

function Attachments({ items }: { items: LiveAttachment[] }) {
  if (items.length === 0) return null;
  const images = items.filter((a) => a.mime.startsWith("image/"));
  const files = items.filter((a) => !a.mime.startsWith("image/"));
  return (
    <div className="mt-1.5 space-y-1.5">
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {images.map((a) => (
            <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={a.name} className="h-28 w-full object-cover" loading="lazy" />
            </a>
          ))}
        </div>
      )}
      {files.map((a) => (
        <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs hover:border-accent">
          <FileIcon size={14} className="shrink-0 text-muted" />
          <span className="min-w-0 flex-1 truncate">{a.name}</span>
          <span className="shrink-0 text-muted">{fileSize(a.size)}</span>
        </a>
      ))}
    </div>
  );
}

const dayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
const TYPING_MS = 4000; // « écrit… » disparaît 4 s après le dernier signal

/**
 * Fil de la conversation en direct : les nouveaux messages arrivent par un flux (EventSource) sans recharger la page, avec
 * l'indication « est en train d'écrire » et « Vu » sous ton dernier message. Si le flux est coupé (réseau, proxy), on interroge
 * le serveur toutes les 4 s en attendant qu'il revienne.
 */
export function LiveThread({ conversationId, meId, otherName, otherReadAt, initial, onReply, isGroup = false, participantNames }: {
  conversationId: number; meId: number; otherName: string; otherReadAt: string | null; initial: LiveMessage[]; onReply?: (m: LiveMessage) => void;
  isGroup?: boolean; participantNames?: Record<number, string>;
}) {
  const nameOf = (userId: number) => (userId === meId ? "Toi" : (participantNames?.[userId] ?? otherName));
  const [items, setItems] = useState<LiveMessage[]>(initial);
  const [live, setLive] = useState(false);
  const [typingUserId, setTypingUserId] = useState<number | null>(null);
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

  // « Présente » dans la conversation (onglet visible) : le serveur ne pousse pas de notification tant que c'est le cas.
  useEffect(() => {
    const sync = () => { void setConversationPresence(conversationId, document.visibilityState === "visible"); };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => { document.removeEventListener("visibilitychange", sync); void setConversationPresence(conversationId, false); };
  }, [conversationId]);

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
      if (m.senderId !== meId) { setTypingUserId(null); read(); }
    });
    es.addEventListener("typing", (e) => {
      const { userId } = JSON.parse((e as MessageEvent<string>).data) as { userId: number };
      if (userId === meId) return;
      setTypingUserId(userId);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTypingUserId(null), TYPING_MS);
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
  }, [items.length, typingUserId]);

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
            <li key={m.id} className={`group flex flex-col ${mine ? "items-end" : "items-start"} ${m.id > openedAtId ? "anim-msg-in" : ""}`}>
              <div className={`flex items-end gap-1.5 ${mine ? "flex-row-reverse" : ""}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-accent text-accent-fg" : "border border-line bg-bg"}`}>
                  {isGroup && !mine && <p className="mb-0.5 text-xs font-semibold text-accent">{nameOf(m.senderId)}</p>}
                  {m.replyTo && (
                    <div className={`mb-1.5 rounded-lg border-l-2 px-2 py-1 text-xs ${mine ? "border-accent-fg/40 bg-black/10" : "border-accent bg-surface"}`}>
                      <p className="font-medium">{nameOf(m.replyTo.senderId)}</p>
                      <p className="truncate opacity-80">{m.replyTo.body || "Pièce jointe"}</p>
                    </div>
                  )}
                  {m.body && <MessageBody>{m.body}</MessageBody>}
                  <Attachments items={m.attachments} />
                  <p className={`mt-1 text-[11px] ${mine ? "opacity-70" : "text-muted"}`}>{dayFmt.format(new Date(m.createdAt))}</p>
                </div>
                {onReply && (
                  <button
                    type="button" onClick={() => onReply(m)} aria-label="Répondre à ce message"
                    className="shrink-0 rounded-full p-1.5 text-muted opacity-0 transition hover:bg-bg hover:text-fg group-hover:opacity-100"
                  >
                    <Reply size={14} />
                  </button>
                )}
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
        {typingUserId !== null && (
          <li className="anim-msg-in flex items-center gap-2 text-muted" aria-label={`${nameOf(typingUserId)} est en train d'écrire`}>
            <span className="flex items-center gap-1 rounded-2xl border border-line bg-bg px-4 py-3" aria-hidden><i className="typing-dot" /><i className="typing-dot" /><i className="typing-dot" /></span>
            <span className="text-xs">{nameOf(typingUserId)} écrit…</span>
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
