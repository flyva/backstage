"use client";

import { useId, useRef, useState } from "react";
import { X } from "lucide-react";

type Option = { value: number; label: string };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Choix de plusieurs personnes « en tags » : on tape, la liste se filtre, on choisit ; chaque choix devient une pastille.
// Les valeurs choisies partent avec le formulaire (un champ caché par personne, même nom).
export function TagPicker({
  id,
  name,
  options,
  defaultValue = [],
  placeholder = "Ajouter…",
  onChange,
}: {
  id: string;
  name: string;
  options: Option[];
  defaultValue?: number[];
  placeholder?: string;
  onChange?: (values: number[]) => void;
}) {
  const listId = useId();
  const [selected, setSelected] = useState<number[]>(defaultValue);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const byId = new Map(options.map((o) => [o.value, o]));
  const matches = options.filter((o) => !selected.includes(o.value) && norm(o.label).includes(norm(query.trim())));

  const add = (value: number) => {
    const next = selected.includes(value) ? selected : [...selected, value];
    setSelected(next);
    onChange?.(next);
    setQuery("");
    setActive(0);
    input.current?.focus();
  };
  const remove = (value: number) => {
    const next = selected.filter((v) => v !== value);
    setSelected(next);
    onChange?.(next);
  };

  return (
    <div
      className="relative"
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false); }}
    >
      {selected.map((v) => <input key={v} type="hidden" name={name} value={v} />)}
      <div
        className="input flex min-h-10 cursor-text flex-wrap items-center gap-1.5 py-1.5"
        onClick={() => input.current?.focus()}
      >
        {selected.map((v) => (
          <span key={v} className="flex items-center gap-1 rounded-full bg-accent/15 py-0.5 pl-2.5 pr-1 text-sm">
            {byId.get(v)?.label ?? `#${v}`}
            <button type="button" onClick={() => remove(v)} className="rounded-full p-0.5 text-muted hover:text-danger" aria-label={`Retirer ${byId.get(v)?.label ?? v}`}>
              <X size={13} />
            </button>
          </span>
        ))}
        <input
          ref={input}
          id={id}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => (matches.length ? (a + 1) % matches.length : 0)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (matches.length ? (a <= 0 ? matches.length - 1 : a - 1) : 0)); }
            else if (e.key === "Enter") { if (open && matches[active]) { e.preventDefault(); add(matches[active].value); } else if (open) e.preventDefault(); }
            else if (e.key === "Escape") setOpen(false);
            else if (e.key === "Backspace" && query === "" && selected.length > 0) remove(selected[selected.length - 1]);
          }}
          placeholder={selected.length === 0 ? placeholder : ""}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          className="min-w-24 flex-1 bg-transparent text-sm outline-none"
        />
      </div>
      {open && (
        <ul id={listId} role="listbox" className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-line bg-surface p-1 shadow-lg">
          {matches.length === 0 && <li className="px-3 py-2 text-sm text-muted">{options.length === selected.length ? "Tout le monde est déjà ajouté" : "Aucun résultat"}</li>}
          {matches.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); add(o.value); }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer rounded-lg px-3 py-2 text-sm ${i === active ? "bg-accent/15" : ""}`}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
