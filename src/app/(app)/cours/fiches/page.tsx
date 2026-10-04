import Link from "next/link";
import { FileDown, Printer } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { loadSubjects } from "@/lib/subjects";

export const metadata = { title: "Fiches par matière" };

export default async function FichesPage() {
  const user = await requireUser();
  const subjects = await loadSubjects(user.id);
  const withNotes = subjects.filter((s) => s.noted.length > 0);

  return (
    <div className="max-w-3xl space-y-5">
      <header className="space-y-1">
        <p className="text-sm"><Link href="/cours" className="text-muted underline">← Mes cours</Link></p>
        <h1 className="text-2xl font-bold">Fiches par matière</h1>
        <p className="text-sm text-muted">Tes notes regroupées par matière et classées par date. Imprime-les ou enregistre-les en PDF depuis la page d&apos;impression.</p>
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
          </li>
        ))}
      </ul>
    </div>
  );
}
