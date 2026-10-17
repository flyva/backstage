"use client";

import { useEffect, useId, useRef, useState } from "react";
import { User, X } from "lucide-react";

type Person = { id: number; name: string; avatar: string | null; email3is: string | null; phone: string | null };

/**
 * Choix de plusieurs personnes de l'annuaire (pour un groupe) : tape pour chercher, clic pour ajouter, chaque
 * personne choisie devient une puce retirable. Pose un champ caché (name) par personne choisie.
 */
export function PeoplePicker({ name, placeholder = "Ajouter une personne…" }: { name: string; placeholder?: string }) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Person[] | null>(null);
  const [selected, setSelected] = useState<Person[]>([]);
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

  const add = (p: Person) => {
    setSelected((cur) => (cur.some((s) => s.id === p.id) ? cur : [...cur, p]));
    setQuery("");
    setOpen(false);
  };
  const remove = (id: number) => setSelected((cur) => cur.filter((s) => s.id !== id));
  const available = (people ?? []).filter((p) => !selected.some((s) => s.id === p.id));

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {selected.map((p) => (
            <li key={p.id} className="flex items-center gap-1.5 rounded-full border border-line bg-bg py-1 pl-1 pr-2 text-sm">
              <input type="hidden" name={name} value={p.id} />
              {p.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.avatar} alt="" className="size-6 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-muted"><User size={12} /></span>
              )}
              {p.name}
              <button type="button" onClick={() => remove(p.id)} aria-label={`Retirer ${p.name}`} className="rounded-full p-0.5 text-muted hover:text-danger"><X size={13} /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false); }}>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!available.length) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % available.length); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? available.length - 1 : a - 1)); }
            else if (e.key === "Enter" && open) { e.preventDefault(); if (available[active]) add(available[active]); }
            else if (e.key === "Escape") setOpen(false);
          }}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open && !!available.length}
          aria-autocomplete="list"
          aria-controls={listId}
          className="input w-full"
        />
        {open && query.trim().length >= 2 && people && (
          <ul id={listId} role="listbox" className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-line bg-surface shadow-lg">
            {available.length === 0 && <li className="px-3 py-2 text-sm text-muted">Personne trouvé(e) dans l&apos;annuaire</li>}
            {available.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(p)}
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
    </div>
  );
}
