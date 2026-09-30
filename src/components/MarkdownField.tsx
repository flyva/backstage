"use client";

import { useRef, useState } from "react";
import { Bold, Code, Heading2, Italic, Link2, List, ListOrdered, Quote } from "lucide-react";
import { Markdown } from "@/components/Markdown";

type Tool = { label: string; icon: typeof Bold; run: (sel: string) => { text: string; from: number; to: number } };

// Insère la mise en forme autour de la sélection ; from/to = sélection à restaurer, relative au début du texte inséré.
const around = (a: string, b: string, ph: string): Tool["run"] => (sel) => {
  const inner = sel || ph;
  return { text: `${a}${inner}${b}`, from: a.length, to: a.length + inner.length };
};
const prefixLines = (prefix: (i: number) => string, ph: string): Tool["run"] => (sel) => {
  const lines = (sel || ph).split("\n");
  const text = lines.map((l, i) => prefix(i) + l).join("\n");
  return { text, from: 0, to: text.length };
};

const TOOLS: Tool[] = [
  { label: "Gras", icon: Bold, run: around("**", "**", "texte en gras") },
  { label: "Italique", icon: Italic, run: around("*", "*", "texte en italique") },
  { label: "Titre", icon: Heading2, run: prefixLines(() => "## ", "Titre") },
  { label: "Liste à puces", icon: List, run: prefixLines(() => "- ", "élément") },
  { label: "Liste numérotée", icon: ListOrdered, run: prefixLines((i) => `${i + 1}. `, "élément") },
  { label: "Citation", icon: Quote, run: prefixLines(() => "> ", "citation") },
  { label: "Code", icon: Code, run: around("`", "`", "code") },
  {
    label: "Lien",
    icon: Link2,
    run: (sel) => {
      const label = sel || "texte du lien";
      return { text: `[${label}](https://)`, from: label.length + 3, to: label.length + 11 };
    },
  },
];

// Éditeur : barre de mise en forme (pas besoin de connaître le Markdown) + onglet d'aperçu. Le textarea reste dans le DOM
// (masqué en mode aperçu) pour que le contenu soit toujours envoyé avec le formulaire.
export function MarkdownField({
  name = "body",
  defaultValue = "",
  rows = 12,
  maxLength = 100000,
  placeholder,
  label,
}: {
  name?: string;
  defaultValue?: string;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  label?: string;
}) {
  const [text, setText] = useState(defaultValue);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const ref = useRef<HTMLTextAreaElement>(null);

  const apply = (tool: Tool) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const r = tool.run(text.slice(start, end));
    const next = text.slice(0, start) + r.text + text.slice(end);
    if (next.length > maxLength) return;
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + r.from, start + r.to);
    });
  };

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-1">
        <div className="flex gap-1" role="tablist" aria-label={label ?? "Mode de l'éditeur"}>
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1 text-xs ${tab === t ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"}`}
            >
              {t === "write" ? "Écrire" : "Aperçu"}
            </button>
          ))}
        </div>
        {tab === "write" && (
          <div className="ml-auto flex flex-wrap gap-0.5" role="toolbar" aria-label="Mise en forme">
            {TOOLS.map((t) => (
              <button
                key={t.label}
                type="button"
                title={t.label}
                aria-label={t.label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => apply(t)}
                className="grid size-8 place-items-center rounded-md text-muted hover:bg-bg hover:text-fg"
              >
                <t.icon size={16} />
              </button>
            ))}
          </div>
        )}
      </div>
      <textarea
        ref={ref}
        name={name}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={rows}
        maxLength={maxLength}
        spellCheck
        placeholder={placeholder}
        aria-label={label}
        className={`input ${tab === "write" ? "" : "hidden"}`}
      />
      {tab === "preview" && (
        <div className="card min-h-24">
          {text.trim() ? <Markdown breaks>{text}</Markdown> : <p className="text-sm text-muted">Rien à afficher.</p>}
        </div>
      )}
    </div>
  );
}
