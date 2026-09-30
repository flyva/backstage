"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";

type Suggestion = { label: string; context: string };

// Champ adresse avec suggestions (Base Adresse Nationale) : liste déroulante, flèches haut/bas, Entrée, Échap.
// La valeur envoyée est simplement le texte du champ : le serveur la convertit en coordonnées comme avant.
export function AddressField({
  id,
  name,
  label,
  defaultValue = "",
  placeholder = "12 rue Exemple, 33000 Bordeaux",
  hint,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
}) {
  const listId = useId();
  const [value, setValue] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const skip = useRef(false); // évite de relancer une recherche juste après un choix
  const typed = useRef(false); // les suggestions ne s'ouvrent que si la personne a tapé (pas à l'ouverture du formulaire)

  // Recherche différée : on attend 250 ms sans frappe, et on ignore les réponses périmées.
  useEffect(() => {
    if (skip.current) { skip.current = false; return; }
    if (!typed.current) return;
    const q = value.trim();
    if (q.length < 3) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/address?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { suggestions?: Suggestion[] };
        setItems(data.suggestions ?? []);
        setActive(-1);
        setOpen((data.suggestions ?? []).length > 0);
      } catch {
        /* recherche annulée ou réseau indisponible : on garde la saisie libre */
      }
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [value]);

  // Clic en dehors : ferme la liste.
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const choose = (s: Suggestion) => {
    skip.current = true;
    setValue(s.label);
    setItems([]);
    setOpen(false);
    setActive(-1);
  };

  return (
    <div ref={box} className="relative">
      <label className="label" htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        value={value}
        onChange={(e) => { typed.current = true; setValue(e.target.value); if (e.target.value.trim().length < 3) { setItems([]); setOpen(false); } }}
        onFocus={() => items.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (!open || items.length === 0) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % items.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? items.length - 1 : a - 1)); }
          else if (e.key === "Enter" && active >= 0) { e.preventDefault(); choose(items[active]); }
          else if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        className="input"
      />
      {open && items.length > 0 && (
        <ul id={listId} role="listbox" className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-line bg-surface p-1 shadow-lg">
          {items.map((s, i) => (
            <li
              key={s.label}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown (et non click) : le choix passe avant la perte de focus du champ
              onMouseDown={(e) => { e.preventDefault(); choose(s); }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-start gap-2 rounded-lg px-2.5 py-2 text-sm ${i === active ? "bg-accent/15" : ""}`}
            >
              <MapPin size={14} className="mt-0.5 shrink-0 text-accent" />
              <span className="min-w-0"><span className="block truncate">{s.label}</span><span className="block truncate text-xs text-muted">{s.context}</span></span>
            </li>
          ))}
        </ul>
      )}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
