"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellOff, Image as ImageIcon, NotebookPen, Search, User } from "lucide-react";
import { savePersonalNote, toggleMute } from "@/lib/message-actions";
import { Avatar } from "@/components/people-forms";

export type SharedMedia = { id: number; url: string; name: string };

export function ConversationSidebar({
  conversationId, otherId, otherName, otherAvatar, otherOnline, otherVisible, lastSeen, seen, muted, initialNote, media, onSearch,
}: {
  conversationId: number; otherId: number | null; otherName: string; otherAvatar: string | null; otherOnline?: boolean; otherVisible: boolean;
  lastSeen: string | null; seen?: boolean; muted: boolean; initialNote: string; media: SharedMedia[]; onSearch: (q: string) => void;
}) {
  const [note, setNote] = useState(initialNote);
  const [saved, setSaved] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  const onNoteChange = (value: string) => {
    setNote(value);
    setSaved(false);
    if (!otherId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => { await savePersonalNote(otherId, value); setSaved(true); }, 800);
  };

  return (
    <aside className="card space-y-4 lg:sticky lg:top-20" aria-label="Informations">
      {otherId !== null && (
        <div className="space-y-2 text-center">
          <div className="flex justify-center"><Avatar name={otherName} url={otherAvatar} size={56} online={otherOnline} /></div>
          <div>
            {otherVisible ? <Link href={`/annuaire/${otherId}`} className="font-semibold hover:text-accent">{otherName}</Link> : <span className="font-semibold">{otherName}</span>}
            {(otherOnline || lastSeen) && <p className="text-xs text-muted">{otherOnline ? "En ligne" : `${seen ? "Vu" : "Dernière connexion"} ${lastSeen}`}</p>}
          </div>
        </div>
      )}

      <div>
        <label className="label flex items-center gap-1.5" htmlFor="conv-search"><Search size={13} /> Rechercher dans la conversation</label>
        <input id="conv-search" type="search" onChange={(e) => onSearch(e.target.value)} placeholder="Mot-clé…" className="input" />
      </div>

      <form action={toggleMute}>
        <input type="hidden" name="conversationId" value={conversationId} />
        <button className="btn-ghost w-full text-sm">
          {muted ? <><Bell size={15} /> Réactiver les notifications</> : <><BellOff size={15} /> Mettre en sourdine</>}
        </button>
      </form>

      {media.length > 0 && (
        <div>
          <p className="label flex items-center gap-1.5"><ImageIcon size={13} /> Médias partagés</p>
          <div className="grid grid-cols-3 gap-1.5">
            {media.slice(0, 9).map((m) => (
              <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={m.name} className="aspect-square w-full object-cover" loading="lazy" />
              </a>
            ))}
          </div>
        </div>
      )}

      {otherId !== null && (
        <div>
          <label className="label flex items-center gap-1.5" htmlFor="conv-note"><NotebookPen size={13} /> Note privée (visible par toi seul(e))</label>
          <textarea id="conv-note" rows={3} value={note} onChange={(e) => onNoteChange(e.target.value)} placeholder="Ex. doit me rendre le chargeur HDMI…" className="input text-sm" />
          <p className="mt-1 text-xs text-muted">{saved ? "Enregistrée" : "Enregistrement…"}</p>
        </div>
      )}
      {otherId === null && (
        <p className="flex items-center gap-1.5 text-xs text-muted"><User size={13} /> Groupe : pas de fiche ni de note individuelle.</p>
      )}
    </aside>
  );
}
