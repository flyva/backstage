"use client";

import { useState } from "react";
import { Markdown } from "@/components/Markdown";

// Zone de saisie Markdown avec onglet d'aperçu. Le textarea reste dans le DOM
// (masqué en mode aperçu) pour que le contenu soit toujours envoyé avec le formulaire.
export function MarkdownField({
  name = "body",
  defaultValue = "",
  rows = 12,
  maxLength = 100000,
  placeholder,
}: {
  name?: string;
  defaultValue?: string;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
}) {
  const [text, setText] = useState(defaultValue);
  const [tab, setTab] = useState<"write" | "preview">("write");
  return (
    <div>
      <div className="mb-1 flex gap-1" role="tablist">
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
      <textarea
        name={name}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={rows}
        maxLength={maxLength}
        spellCheck
        placeholder={placeholder}
        className={`input font-mono ${tab === "write" ? "" : "hidden"}`}
      />
      {tab === "preview" && (
        <div className="card min-h-40">
          {text.trim() ? <Markdown>{text}</Markdown> : <p className="text-sm text-muted">Rien à afficher.</p>}
        </div>
      )}
    </div>
  );
}
