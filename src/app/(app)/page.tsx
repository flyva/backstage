import Link from "next/link";
import { ExternalLink, Mail, GraduationCap, Briefcase, Wifi, Map } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { dayKey, getEvents, type AgendaEvent } from "@/lib/ical";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { equipmentItems, loans } from "@/db/schema";
import { daysBetween, isManager, todayParis } from "@/lib/equipment";

const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });

const SOON = [
  "Projets : conduite de spectacle et fiches techniques",
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

  // Matériel : mes prêts à rendre bientôt / en retard, et la file d'attente pour les référents.
  const todayStr = todayParis();
  const myLoans = await db
    .select({ id: loans.id, dueDate: loans.dueDate, itemName: equipmentItems.name, quantity: loans.quantity })
    .from(loans)
    .innerJoin(equipmentItems, eq(equipmentItems.id, loans.itemId))
    .where(and(eq(loans.userId, user.id), eq(loans.status, "out")));
  const dueSoon = myLoans.filter((l) => daysBetween(todayStr, l.dueDate) <= 2).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const pending = isManager(user)
    ? await db.select({ id: loans.id, status: loans.status, dueDate: loans.dueDate }).from(loans).where(inArray(loans.status, ["requested", "out"]))
    : [];
  const toHandle = pending.filter((l) => l.status === "requested").length;
  const lateCount = pending.filter((l) => l.status === "out" && l.dueDate < todayStr).length;

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

      {(dueSoon.length > 0 || toHandle > 0 || lateCount > 0) && (
        <section className="card space-y-1.5 border-accent text-sm">
          <h2 className="font-semibold">Matériel</h2>
          {dueSoon.map((l) => {
            const left = daysBetween(todayStr, l.dueDate);
            return (
              <p key={l.id} className={left < 0 ? "text-danger" : ""}>
                {l.quantity > 1 && `${l.quantity} × `}{l.itemName} : {left < 0 ? `en retard de ${-left} j` : left === 0 ? "à rendre aujourd'hui" : `à rendre dans ${left} j`}
              </p>
            );
          })}
          {toHandle > 0 && <p>{toHandle} demande{toHandle > 1 ? "s" : ""} de prêt à traiter</p>}
          {lateCount > 0 && <p className="text-danger">{lateCount} prêt{lateCount > 1 ? "s" : ""} en retard</p>}
          <Link href={toHandle + lateCount > 0 ? "/materiel/gestion" : "/materiel"} className="inline-block text-xs text-accent underline">Voir le matériel</Link>
        </section>
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
