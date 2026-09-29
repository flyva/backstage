import Link from "next/link";
import { ExternalLink, Mail, GraduationCap, Briefcase, Wifi, Map } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

const SOON = [
  "Agenda synchronisé avec Ypareo",
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
