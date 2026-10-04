import Link from "next/link";
import { FileDown, Printer } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { aiEnabled } from "@/lib/ai";
import { SheetButton } from "@/components/SheetButton";
import { loadSheets, loadSubjects, sheetKey } from "@/lib/subjects";
import { Markdown } from "@/components/Markdown";

export const metadata = { title: "Fiches par matière" };

export default async function FichesPage() {
  const user = await requireUser();
  const [subjects, sheets] = await Promise.all([loadSubjects(user.id), loadSheets(user.id)]);
  const ai = aiEnabled();
  const withNotes = subjects.filter((s) => s.noted.length > 0);

  return (
    <div className="max-w-3xl space-y-5">
      <header className="space-y-1">
        <p className="text-sm"><Link href="/cours" className="text-muted underline">← Mes cours</Link></p>
        <h1 className="text-2xl font-bold">Fiches par matière</h1>
        <p className="text-sm text-muted">Tes notes regroupées par matière et classées par date. Imprime-les ou enregistre-les en PDF depuis la page d&apos;impression.{ai && " Le bouton « Générer » envoie tes notes de la matière à Mistral (IA) pour en tirer une fiche de révision."}</p>
      </header>

      {withNotes.length > 0 && (
        <div className="card flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium">Toutes les matières ({withNotes.length})</span>
          <span className="flex gap-2">
            <Link href="/cours/fiches/imprimer" className="btn-ghost text-sm"><Printer size={15} aria-hidden /> PDF / imprimer</Link>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- téléchargement de fichier */}
            <a href="/cours/fiches/export" className="btn-ghost text-sm"><FileDown size={15} aria-hidden /> Markdown</a>
          </span>
        </div>
      )}

      {subjects.length === 0 && <p className="text-sm text-muted">Aucun cours enregistré pour l&apos;instant. Ajoute ton lien iCalendar dans ton <Link href="/profil" className="text-accent underline">profil</Link>.</p>}

      <ul className="space-y-2">
        {subjects.map((s) => (
          <li key={s.key} className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block font-medium leading-snug">{s.name}</span>
              <span className="text-xs text-muted">{s.courses.length} cours · {s.noted.length} avec notes</span>
            </span>
            {s.noted.length > 0 ? (
              <span className="flex gap-2">
                <Link href={`/cours/fiches/imprimer?matiere=${encodeURIComponent(s.key)}`} className="btn-ghost text-sm"><Printer size={15} aria-hidden /> PDF</Link>
                <a href={`/cours/fiches/export?matiere=${encodeURIComponent(s.key)}`} className="btn-ghost text-sm"><FileDown size={15} aria-hidden /> .md</a>
              </span>
            ) : <span className="text-xs text-muted">Pas encore de notes</span>}
            </div>
            {ai && s.noted.length > 0 && (
              <div className="space-y-2">
                <SheetButton subjectKey={s.key} again={sheets.has(sheetKey(s.key))} />
                {sheets.get(sheetKey(s.key)) && (
                  <details className="rounded-xl border border-line bg-bg p-3 text-sm">
                    <summary className="cursor-pointer text-muted">Fiche de révision générée par IA</summary>
                    <div className="mt-2"><Markdown>{sheets.get(sheetKey(s.key))!.content}</Markdown></div>
                    <p className="mt-2 text-[11px] text-muted">Générée à partir de tes notes par Mistral : relis-la, elle peut contenir des erreurs.</p>
                  </details>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
