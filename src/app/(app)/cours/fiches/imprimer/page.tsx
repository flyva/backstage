import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { loadSubjects } from "@/lib/subjects";
import { Markdown } from "@/components/Markdown";
import { PrintButton } from "@/components/PrintButton";

export const metadata = { title: "Fiches de cours" };

const dayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });

// Fiches de révision prêtes à imprimer ou à enregistrer en PDF : les notes de chaque matière, par date.
export default async function FichesPrintPage({ searchParams }: PageProps<"/cours/fiches/imprimer">) {
  const user = await requireUser();
  const only = (await searchParams).matiere;
  const subjects = (await loadSubjects(user.id)).filter((s) => s.noted.length > 0 && (typeof only !== "string" || s.key === only));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/cours/fiches" className="text-sm text-muted hover:text-fg">← Fiches par matière</Link>
        <PrintButton />
      </div>
      <header className="border-b border-line pb-3">
        <h1 className="text-2xl font-bold">{subjects.length === 1 ? subjects[0].name : "Fiches de cours"}</h1>
        <p className="text-sm text-muted">{user.name} · {subjects.length} matière{subjects.length > 1 ? "s" : ""}</p>
      </header>
      {subjects.length === 0 && <p className="text-sm text-muted">Aucune note à imprimer.</p>}
      {subjects.map((s) => (
        <section key={s.key} className="space-y-3">
          {subjects.length > 1 && <h2 className="text-xl font-bold">{s.name}</h2>}
          {s.noted.map((c) => (
            <article key={c.id} className="break-inside-avoid space-y-1 border-b border-line pb-3">
              <h3 className="font-semibold capitalize">{dayFmt.format(c.startsAt)} <span className="font-normal normal-case text-muted">· {c.allDay ? "journée" : `${timeFmt.format(c.startsAt)}–${timeFmt.format(c.endsAt)}`}{c.location ? ` · ${c.location}` : ""}</span></h3>
              <Markdown breaks>{c.note ?? ""}</Markdown>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
