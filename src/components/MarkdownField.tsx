"use client";

import { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import TurndownService from "turndown";
import { Bold, Code, Heading2, ImagePlus, Italic, Link2, List, ListOrdered, Quote } from "lucide-react";

const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced" });

// Convertit l'italique en _texte_ (et pas *texte*, pour ne pas se confondre visuellement avec le gras **texte**).
turndown.addRule("italic", { filter: ["i", "em"], replacement: (content) => (content.trim() ? `_${content}_` : "") });

// Ce que le collage peut apporter (Word, Google Docs, une page web…) : le reste (classes, styles, span Word…) est jeté.
const ALLOWED_TAGS = new Set(["P", "BR", "B", "STRONG", "I", "EM", "UL", "OL", "LI", "H1", "H2", "H3", "BLOCKQUOTE", "CODE", "PRE", "A", "IMG", "DIV"]);
const ALLOWED_ATTRS: Record<string, string[]> = { A: ["href"], IMG: ["src", "alt"] };

function sanitize(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const walk = (node: Node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        if (!ALLOWED_TAGS.has(el.tagName)) {
          // Balise pas autorisée (span, style Word…) : on garde le contenu, pas l'enrobage.
          while (el.firstChild) el.before(el.firstChild);
          el.remove();
          return;
        }
        [...el.attributes].forEach((a) => {
          if (!(ALLOWED_ATTRS[el.tagName] ?? []).includes(a.name)) el.removeAttribute(a.name);
        });
        walk(el);
      } else if (child.nodeType !== Node.TEXT_NODE) {
        child.remove(); // commentaires, etc.
      }
    });
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

type Tool = { label: string; icon: typeof Bold; run: () => void };
type Bubble = { top: number; left: number };

// Éditeur de texte riche (WYSIWYG) : la mise en forme s'affiche directement (gras, titres…), pas de symboles Markdown
// visibles. Une barre flottante façon Notion/Medium apparaît au-dessus du texte sélectionné, plutôt qu'une barre fixe
// toujours affichée. Le texte est toujours enregistré en Markdown (converti à la volée avec Turndown), donc le reste
// de l'appli (stockage, affichage ailleurs) n'a rien à changer.
export function MarkdownField({
  name = "body",
  defaultValue = "",
  rows = 12,
  maxLength = 100000,
  placeholder,
  label,
  uploadUrl,
  onEdit,
}: {
  name?: string;
  defaultValue?: string;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  label?: string;
  /** Si renseigné : bouton image en coin de l'éditeur qui envoie le fichier à cette adresse et insère le lien. */
  uploadUrl?: string;
  /** Appelé après chaque modification du texte. */
  onEdit?: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const [count, setCount] = useState(defaultValue.length);
  const [bubble, setBubble] = useState<Bubble | null>(null);

  const sync = () => {
    const html = editorRef.current?.innerHTML ?? "";
    const md = turndown.turndown(html).trim();
    if (hiddenRef.current) hiddenRef.current.value = md;
    setCount(md.length);
    onEdit?.();
  };

  // Barre flottante : positionnée au-dessus de la sélection, seulement quand elle contient du texte et qu'elle est
  // bien dans cet éditeur (et pas dans un autre champ de la page, ou dans le champ "Lien" de la barre elle-même).
  const updateBubble = () => {
    const sel = window.getSelection();
    const wrap = wrapRef.current;
    const editor = editorRef.current;
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !wrap || !editor) { setBubble(null); return; }
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) { setBubble(null); return; }
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) { setBubble(null); return; }
    const wrapRect = wrap.getBoundingClientRect();
    // La bulle est centrée sur son point d'ancrage (-translate-x-1/2) : sans ces bornes, elle peut sortir de
    // l'éditeur (voire de l'écran) à gauche ou à droite sur un champ étroit, ou tout en haut d'une page.
    const half = 150; // ~ moitié de la largeur de la barre (8 boutons)
    const left = Math.min(Math.max(rect.left - wrapRect.left + rect.width / 2, half), Math.max(wrapRect.width - half, half));
    const top = Math.max(rect.top - wrapRect.top, 44); // laisse la place à la bulle (hauteur + marge) si la sélection est tout en haut
    setBubble({ top, left });
  };

  // Première conversion Markdown → HTML au montage seulement : ensuite, l'éditeur est la source de vérité (on ne
  // réécrit jamais son contenu depuis React, ça ferait sauter le curseur pendant la frappe).
  // L'écouteur « input » est posé nativement (pas via la prop React onInput) : sur un contenteditable, cet évènement
  // ne remonte pas toujours de façon fiable jusqu'au gestionnaire synthétique de React selon la façon dont le texte
  // est entré (IME, certains claviers virtuels…) — en direct sur l'élément, il se déclenche à chaque fois.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = defaultValue ? (marked.parse(defaultValue, { breaks: true, async: false }) as string) : "";
    el.addEventListener("input", sync);
    el.addEventListener("keyup", sync);
    document.addEventListener("selectionchange", updateBubble);
    return () => {
      el.removeEventListener("input", sync);
      el.removeEventListener("keyup", sync);
      document.removeEventListener("selectionchange", updateBubble);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = (fn: () => void) => {
    editorRef.current?.focus();
    fn();
    sync();
    updateBubble();
  };

  const upload = async (file: File) => {
    if (!uploadUrl) return;
    setUploadState({ busy: true, error: null });
    const fd = new FormData();
    fd.set("file", file);
    try {
      const res = await fetch(uploadUrl, { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string; name?: string; image?: boolean };
      if (!res.ok || !data.url) {
        setUploadState({ busy: false, error: data.error ?? "Envoi impossible" });
      } else {
        const alt = (data.name ?? "fichier").replace(/\.[^.]+$/, "");
        exec(() => document.execCommand("insertHTML", false, data.image ? `<img src="${data.url}" alt="${alt}">` : `<a href="${data.url}">${data.name ?? "fichier"}</a>`));
        setUploadState({ busy: false, error: null });
      }
    } catch {
      setUploadState({ busy: false, error: "Envoi impossible" });
    } finally {
      if (picker.current) picker.current.value = "";
    }
  };

  const TOOLS: Tool[] = [
    { label: "Gras (Ctrl+B)", icon: Bold, run: () => document.execCommand("bold") },
    { label: "Italique (Ctrl+I)", icon: Italic, run: () => document.execCommand("italic") },
    { label: "Titre", icon: Heading2, run: () => document.execCommand("formatBlock", false, "h2") },
    { label: "Liste à puces", icon: List, run: () => document.execCommand("insertUnorderedList") },
    { label: "Liste numérotée", icon: ListOrdered, run: () => document.execCommand("insertOrderedList") },
    { label: "Citation", icon: Quote, run: () => document.execCommand("formatBlock", false, "blockquote") },
    { label: "Code", icon: Code, run: () => document.execCommand("insertHTML", false, `<code>${window.getSelection()?.toString() || "code"}</code>`) },
    {
      label: "Lien (Ctrl+K)",
      icon: Link2,
      run: () => {
        const url = window.prompt("Adresse du lien (https://…)");
        if (url) document.execCommand("createLink", false, url);
      },
    },
  ];

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "k") return;
    e.preventDefault();
    exec(TOOLS[7].run);
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const html = e.clipboardData.getData("text/html");
    e.preventDefault();
    if (html) document.execCommand("insertHTML", false, sanitize(html));
    else document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
    sync();
  };

  return (
    <div ref={wrapRef} className="relative">
      <input ref={hiddenRef} type="hidden" name={name} defaultValue={defaultValue} />

      {bubble && (
        <div
          role="toolbar"
          aria-label="Mise en forme"
          className="absolute z-20 flex -translate-x-1/2 -translate-y-[calc(100%+8px)] gap-0.5 rounded-xl border border-line bg-fg p-1 shadow-xl"
          style={{ top: bubble.top, left: bubble.left }}
        >
          {TOOLS.map((t) => (
            <button
              key={t.label}
              type="button"
              title={t.label}
              aria-label={t.label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec(t.run)}
              className="grid size-8 place-items-center rounded-lg text-bg/80 hover:bg-bg/15 hover:text-bg"
            >
              <t.icon size={16} />
            </button>
          ))}
        </div>
      )}

      {uploadUrl && (
        <div className="absolute right-2 top-2 z-10">
          <button
            type="button"
            title="Image ou fichier"
            aria-label="Insérer une image ou un fichier"
            disabled={uploadState.busy}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => picker.current?.click()}
            className="grid size-8 place-items-center rounded-lg border border-line bg-surface text-muted shadow-sm hover:bg-bg hover:text-fg disabled:opacity-50"
          >
            <ImagePlus size={16} />
          </button>
          <input
            ref={picker}
            type="file"
            hidden
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.docx,.xlsx,.pptx,.odt,.ods,.odp,.zip"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }}
          />
        </div>
      )}

      {(uploadState.busy || uploadState.error) && (
        <p className={`mb-1 text-xs ${uploadState.error ? "text-danger" : "text-muted"}`} role={uploadState.error ? "alert" : undefined}>
          {uploadState.busy ? "Envoi en cours…" : uploadState.error}
        </p>
      )}
      <div
        ref={editorRef}
        contentEditable
        onPaste={onPaste}
        onKeyDown={onKeyDown}
        onBlur={() => { sync(); setBubble(null); }}
        aria-label={label}
        data-placeholder={placeholder}
        className="input prose-wiki min-h-[6rem] overflow-auto [&:empty]:before:text-muted [&:empty]:before:content-[attr(data-placeholder)]"
        style={{ minHeight: `${rows * 1.5}rem` }}
      />
      {maxLength < 100000 && <p className={`mt-1 text-right text-xs ${count > maxLength ? "text-danger" : "text-muted"}`}>{count} / {maxLength}</p>}
      {!bubble && <p className="mt-1 text-xs text-muted">Sélectionne du texte pour le mettre en forme (gras, titre, lien…).</p>}
    </div>
  );
}
