"use client";

import { useActionState, useRef, useState } from "react";
import { Eye, Pencil } from "lucide-react";
import { saveCourseNote } from "@/lib/course-actions";
import { MarkdownField } from "@/components/MarkdownField";
import { Markdown } from "@/components/Markdown";

// Éditeur des notes d'un cours : même barre de mise en forme que le wiki (gras, titres, listes, liens, images), avec aperçu.
export function CourseNoteEditor({ id, note, cancelHref }: { id: number; note: string; cancelHref: string }) {
  const [state, action, pending] = useActionState(saveCourseNote, undefined);
  const form = useRef<HTMLFormElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const showPreview = () => setPreview((form.current?.elements.namedItem("note") as HTMLTextAreaElement | null)?.value ?? "");
  const tab = (active: boolean) => `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${active ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"}`;

  return (
    <form ref={form} action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div className="flex gap-1" role="tablist" aria-label="Mode d'édition">
        <button type="button" role="tab" aria-selected={preview === null} className={tab(preview === null)} onClick={() => setPreview(null)}><Pencil size={14} aria-hidden /> Écrire</button>
        <button type="button" role="tab" aria-selected={preview !== null} className={tab(preview !== null)} onClick={showPreview}><Eye size={14} aria-hidden /> Aperçu</button>
      </div>

      {/* Le champ reste dans la page (masqué) pendant l'aperçu : son contenu est conservé et envoyé à l'enregistrement. */}
      <div hidden={preview !== null}>
        <MarkdownField name="note" defaultValue={note} rows={20} maxLength={20000} uploadUrl="/api/wiki/files" label="Notes du cours" placeholder="Écris tes notes ici : titres, listes, schémas (image), liens… Le gras, les titres et les listes se font avec les boutons au-dessus." />
      </div>
      {preview !== null && (
        <div className="min-h-40 rounded-xl border border-line bg-bg p-4">
          {preview.trim() ? <Markdown breaks>{preview}</Markdown> : <p className="text-sm text-muted">Rien à afficher pour l&apos;instant.</p>}
        </div>
      )}

      {state?.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer les notes"}</button>
        <a href={cancelHref} className="text-sm text-muted underline">Annuler</a>
      </div>
    </form>
  );
}
