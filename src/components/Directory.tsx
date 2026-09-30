"use client";

import { useMemo, useState } from "react";
import { Mail, Phone } from "lucide-react";
import { Avatar } from "@/components/people-forms";
import { LINK_LABEL } from "@/lib/people-shared";
import type { LinkKind } from "@/db/schema";

export type Person = {
  id: number;
  name: string;
  avatar: string | null;
  trackId: number | null;
  track: string | null;
  headline: string | null;
  email3is: string | null;
  phone: string | null;
  links: { kind: LinkKind; url: string; label: string | null }[];
  cardUrl: string | null;
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function Directory({ people, tracks }: { people: Person[]; tracks: { id: number; name: string }[] }) {
  const [q, setQ] = useState("");
  const [track, setTrack] = useState("");
  const shown = useMemo(() => {
    const n = norm(q.trim());
    return people.filter((p) => {
      if (track === "none" ? p.trackId !== null : track && String(p.trackId) !== track) return false;
      if (!n) return true;
      return [p.name, p.track, p.headline, p.email3is, ...p.links.map((l) => `${LINK_LABEL[l.kind]} ${l.label ?? ""}`)].some((v) => v && norm(v).includes(n));
    });
  }, [people, q, track]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q} onChange={(e) => setQ(e.target.value)} list="annuaire-noms" type="search"
          placeholder="Rechercher un nom, une filière, un réseau…" className="input max-w-md flex-1" aria-label="Rechercher dans l'annuaire"
        />
        <datalist id="annuaire-noms">{people.map((p) => <option key={p.id} value={p.name} />)}</datalist>
        <select value={track} onChange={(e) => setTrack(e.target.value)} className="input w-auto" aria-label="Filtrer par filière">
          <option value="">Toutes les filières</option>
          {tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          <option value="none">Sans filière</option>
        </select>
        <span className="text-sm text-muted">{shown.length} personne{shown.length > 1 ? "s" : ""}</span>
      </div>
      {shown.length === 0 && <p className="text-sm text-muted">Personne ne correspond à cette recherche.</p>}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((p) => (
          <li key={p.id} className="card flex gap-3 p-4">
            <Avatar name={p.name} url={p.avatar} size={52} />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="truncate font-semibold">{p.name}</div>
              {p.track && <span className="inline-block rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-muted">{p.track}</span>}
              {p.headline && <div className="text-sm text-muted">{p.headline}</div>}
              {p.email3is && <a href={`mailto:${p.email3is}`} className="flex items-center gap-1.5 truncate text-sm underline"><Mail size={13} aria-hidden /> {p.email3is}</a>}
              {p.phone && <a href={`tel:${p.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-1.5 text-sm underline"><Phone size={13} aria-hidden /> {p.phone}</a>}
              {p.links.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {p.links.map((l, i) => (
                    <a key={i} href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="rounded-full border border-line px-2 py-0.5 text-xs hover:bg-bg" title={l.url}>{l.label || LINK_LABEL[l.kind]}</a>
                  ))}
                </div>
              )}
              {p.cardUrl && <a href={p.cardUrl} target="_blank" rel="noopener noreferrer" className="block pt-1 text-xs text-muted underline">Carte de visite</a>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
