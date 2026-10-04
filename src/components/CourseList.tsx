"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MapPin, NotebookPen, Search, X } from "lucide-react";

export type CourseItem = {
  id: number;
  title: string;
  subjectKey: string;
  subjectName: string;
  day: string; // AAAA-MM-JJ (heure de Paris)
  dayLabel: string;
  time: string;
  location: string;
  excerpt: string;
  hasNote: boolean;
  removed: boolean;
  external: boolean; // ajouté à la main, hors planning de l'école
};

type Kind = "all" | "school" | "external" | "notes";
const KINDS: { id: Kind; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "school", label: "École" },
  { id: "external", label: "Externes" },
  { id: "notes", label: "Avec notes" },
];

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// Liste des cours filtrable instantanément (sans recharger) : texte, matière, jour, origine (école / externe) et notes.
export function CourseList({ items, emptyText }: { items: CourseItem[]; emptyText: string }) {
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("");
  const [day, setDay] = useState("");
  const [kind, setKind] = useState<Kind>("all");

  const subjects = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of items) if (!m.has(c.subjectKey)) m.set(c.subjectKey, c.subjectName);
    return [...m].sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }, [items]);

  const shown = useMemo(() => {
    const needle = fold(q.trim());
    return items.filter((c) =>
      (!needle || fold(`${c.title} ${c.location} ${c.excerpt}`).includes(needle)) &&
      (!subject || c.subjectKey === subject) &&
      (!day || c.day === day) &&
      (kind === "all" || (kind === "school" && !c.external) || (kind === "external" && c.external) || (kind === "notes" && c.hasNote)),
    );
  }, [items, q, subject, day, kind]);

  const byDay = useMemo(() => [...Map.groupBy(shown, (c) => c.day)], [shown]);
  const filtering = !!(q || subject || day || kind !== "all");
  const reset = () => { setQ(""); setSubject(""); setDay(""); setKind("all"); };
  const chip = (active: boolean) => `rounded-full border px-3 py-1 text-sm ${active ? "border-accent bg-accent text-accent-fg" : "border-line text-muted hover:text-fg"}`;

  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem_10rem]">
          <label className="relative block">
            <span className="sr-only">Rechercher un cours</span>
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (titre, salle, notes)…" className="input pl-9" />
          </label>
          <label className="block">
            <span className="sr-only">Matière</span>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className="input">
              <option value="">Toutes les matières</option>
              {subjects.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Jour</span>
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="input" />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {KINDS.map((k) => <button key={k.id} type="button" className={chip(kind === k.id)} onClick={() => setKind(k.id)}>{k.label}</button>)}
          {filtering && <button type="button" onClick={reset} className="ml-auto flex items-center gap-1 text-sm text-muted underline"><X size={14} aria-hidden /> Effacer les filtres</button>}
        </div>
        <p className="text-xs text-muted" aria-live="polite">{shown.length} cours{filtering ? ` sur ${items.length}` : ""}</p>
      </div>

      {shown.length === 0 && <p className="text-sm text-muted">{filtering ? "Aucun cours ne correspond à ces filtres." : emptyText}</p>}

      {byDay.map(([key, list]) => (
        <section key={key} className="space-y-2">
          <h2 className="text-sm font-semibold capitalize text-muted">{list[0].dayLabel}</h2>
          <ul className="space-y-2">
            {list.map((c) => (
              <li key={c.id}>
                <Link href={`/cours/${c.id}`} className="card flex items-start gap-3 p-4 hover:border-accent">
                  <span className="w-24 shrink-0 text-sm font-semibold tabular-nums">{c.time}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium leading-snug">{c.title}</span>
                      {c.external && <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">Externe</span>}
                    </span>
                    {c.location && <span className="mt-0.5 flex items-center gap-1 text-xs text-muted"><MapPin size={12} aria-hidden /> {c.location}</span>}
                    {c.excerpt && <span className="mt-1 line-clamp-2 block text-xs text-muted">{c.excerpt}</span>}
                    {c.removed && <span className="mt-1 inline-block rounded-full border border-danger/50 px-2 py-0.5 text-[11px] text-danger">Retiré du planning de l&apos;école</span>}
                  </span>
                  <NotebookPen size={16} className={`mt-0.5 shrink-0 ${c.hasNote ? "text-accent" : "text-line"}`} aria-label={c.hasNote ? "Ce cours a des notes" : "Ajouter des notes"} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
