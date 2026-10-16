"use client";

import { useEffect, useId, useRef, useState } from "react";
import { User, X } from "lucide-react";

type Person = { id: number; name: string; avatar: string | null; email3is: string | null; phone: string | null };

/**
 * Choix d'une personne de l'annuaire, en tapant son nom, prénom, email ou téléphone (comme la recherche du haut) :
 * les suggestions montrent Nom Prénom, email et téléphone (si affichés), un clic la choisit. Pose un champ caché
 * (name) avec l'identifiant choisi.
 */
export function PersonPicker({ name, placeholder = "Nom, prénom, email ou téléphone…", id }: { name: string; placeholder?: string; id?: string }) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Person[] | null>(null);
  const [selected, setSelected] = useState<Person | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    const reqId = ++requestId.current;
    if (q.length < 2) {
      const clear = setTimeout(() => { if (reqId === requestId.current) setPeople(null); }, 0);
      return () => clearTimeout(clear);
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/annuaire/search?q=${encodeURIComponent(q)}`);
        if (reqId !== requestId.current) return;
        if (!res.ok) { setPeople([]); return; }
        const data = (await res.json()) as { people?: Person[] };
        setPeople(data.people ?? []);
      } catch {
        if (reqId === requestId.current) setPeople([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  if (selected) {
    return (
      <div className="input flex items-center gap-2.5 py-1.5">
        <input type="hidden" name={name} value={selected.id} />
        {selected.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={selected.avatar} alt="" className="size-7 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-muted"><User size={14} /></span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{selected.name}</span>
          <span className="block truncate text-xs text-muted">{[selected.email3is, selected.phone].filter(Boolean).join(" · ") || "—"}</span>
        </span>
        <button type="button" onClick={() => { setSelected(null); setQuery(""); }} className="rounded-full p-1 text-muted hover:text-danger" aria-label="Changer de personne"><X size={15} /></button>
      </div>
    );
  }

  return (
    <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false); }}>
      <input
        id={id}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!people || people.length === 0) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % people.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? people.length - 1 : a - 1)); }
          else if (e.key === "Enter" && open) { e.preventDefault(); if (people[active]) setSelected(people[active]); }
          else if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && !!people?.length}
        aria-autocomplete="list"
        aria-controls={listId}
        className="input w-full"
      />
      {open && query.trim().length >= 2 && people && (
        <ul id={listId} role="listbox" className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-line bg-surface shadow-lg">
          {people.length === 0 && <li className="px-3 py-2 text-sm text-muted">Personne trouvé(e) dans l&apos;annuaire</li>}
          {people.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setSelected(p); setOpen(false); }}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${i === active ? "bg-accent/15" : ""}`}
              >
                {p.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatar} alt="" className="size-7 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-muted"><User size={14} /></span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="block truncate text-xs text-muted">{[p.email3is, p.phone].filter(Boolean).join(" · ") || "—"}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
