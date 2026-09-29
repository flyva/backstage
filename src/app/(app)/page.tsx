import Link from "next/link";
import { ExternalLink, Mail, GraduationCap, Briefcase, Wifi, Map } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { dayKey, getEvents, type AgendaEvent } from "@/lib/ical";

const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });

const SOON = [
  "Projets : conduite, checklists, fiches techniques",
  "Prêt de matériel de l'école",
  "Wiki de ressources, kanban, actus, BDE, galerie",
];

export default async function HomePage() {
  const user = await requireUser();
  const s = await getSettings();
  const shortcuts = [
    { label: "Webmail 3IS", href: s.webmail_url, icon: Mail },
    { label: "Ypareo", href: s.ypareo_url, icon: GraduationCap },
    { label: "Studea", href: s.studea_url, icon: Briefcase },
  ].filter((x) => x.href);

  // Cours du jour (silencieux si le planning est indisponible : l'accueil doit toujours s'afficher).
  let today: AgendaEvent[] | null = null;
  if (user.icalUrl) {
    try {
      const now = new Date();
      const from = new Date(now.getTime() - 864e5);
      const to = new Date(now.getTime() + 2 * 864e5);
      today = (await getEvents(user.icalUrl, from, to)).filter((e) => dayKey(e.start) === dayKey(now));
    } catch {
      today = null;
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Salut {user.name.split(" ")[0]} 👋</h1>
        <p className="text-sm text-muted">Ton hub 3IS : cours, école, transports et ressources au même endroit.</p>
      </header>

      {!user.onboarded && (
        <div className="card border-accent">
          <p className="text-sm">
            Complète ton <Link href="/profil" className="font-medium text-accent underline">profil</Link> :
            adresse du domicile et lien iCalendar Ypareo pour personnaliser ton espace.
          </p>
        </div>
      )}

      {today && (
        <section className="card space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Aujourd&apos;hui</h2>
            <Link href="/agenda" className="text-xs text-accent underline">Voir la semaine</Link>
          </div>
          {today.length === 0 ? (
            <p className="text-sm text-muted">Rien de prévu dans ton planning.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {today.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="w-28 shrink-0 tabular-nums text-accent">
                    {e.allDay ? "Journée" : `${timeFmt.format(e.start)} – ${timeFmt.format(e.end)}`}
                  </span>
                  <span className="min-w-0 flex-1">
                    {e.title}
                    {e.location && <span className="text-muted"> · {e.location}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shortcuts.map(({ label, href, icon: Icon }) => (
          <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="card flex items-center gap-3 hover:border-accent">
            <Icon className="text-accent" size={22} />
            <span className="flex-1 font-medium">{label}</span>
            <ExternalLink size={14} className="text-muted" />
          </a>
        ))}
        <Link href="/ecole" className="card flex items-center gap-3 hover:border-accent">
          <Wifi className="text-accent" size={22} />
          <span className="flex-1 font-medium">Wi-Fi de l&apos;école</span>
        </Link>
        <Link href="/ecole" className="card flex items-center gap-3 hover:border-accent">
          <Map className="text-accent" size={22} />
          <span className="flex-1 font-medium">Plan de l&apos;école</span>
        </Link>
      </section>

      {shortcuts.length === 0 && user.role === "admin" && (
        <p className="text-sm text-muted">
          Astuce admin : renseigne les liens webmail, Ypareo et Studea dans <Link href="/admin" className="text-accent underline">Admin</Link>.
        </p>
      )}

      <section className="card">
        <h2 className="mb-2 font-semibold">Bientôt dans Backstage</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-muted">
          {SOON.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </section>
    </div>
  );
}
