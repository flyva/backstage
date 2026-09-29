import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { AlertTriangle, Bike, Briefcase, Clock, ExternalLink, GraduationCap, Mail, MapPin, Package, TramFront, type LucideIcon } from "lucide-react";
import { db } from "@/db";
import { equipmentItems, loans, newsPosts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { dayKey, getEvents, type AgendaEvent } from "@/lib/ical";
import { daysBetween, STATUS_LABEL, todayParis } from "@/lib/equipment";
import { homeGlance } from "@/lib/glance";
import { ago } from "@/lib/relative-time";

const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
const shortDate = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", day: "numeric", month: "short" });

type Stat = { label: string; value: string; sub: string; icon: LucideIcon; color: string; href: string };

// Carte avec liseré coloré en haut (clin d'œil AdminLTE) et coins arrondis (TailAdmin).
const section = "card p-0 border-t-[3px]";

export default async function HomePage() {
  const user = await requireUser();
  const s = await getSettings();
  const today = todayParis();

  const home = user.homeLat != null && user.homeLng != null ? { lat: user.homeLat, lng: user.homeLng } : null;

  // Chaque source est indépendante : si l'une échoue, l'accueil s'affiche quand même.
  const [events, glance, myLoans, news] = await Promise.all([
    (async (): Promise<AgendaEvent[] | null> => {
      if (!user.icalUrl) return null;
      try {
        const now = new Date();
        const all = await getEvents(user.icalUrl, new Date(now.getTime() - 864e5), new Date(now.getTime() + 2 * 864e5));
        return all.filter((e) => dayKey(e.start) === dayKey(now));
      } catch {
        return null;
      }
    })(),
    homeGlance(home),
    db
      .select({ id: loans.id, status: loans.status, quantity: loans.quantity, dueDate: loans.dueDate, name: equipmentItems.name })
      .from(loans)
      .innerJoin(equipmentItems, eq(equipmentItems.id, loans.itemId))
      .where(and(eq(loans.userId, user.id), inArray(loans.status, ["requested", "reserved", "out"])))
      .orderBy(loans.dueDate)
      .limit(6),
    db.select({ id: newsPosts.id, title: newsPosts.title, pinned: newsPosts.pinned, createdAt: newsPosts.createdAt }).from(newsPosts).orderBy(desc(newsPosts.pinned), desc(newsPosts.createdAt)).limit(4),
  ]);

  const now = new Date();
  const nextEvent = events?.find((e) => e.end >= now && !e.allDay);
  const stop = glance.stops.find((st) => st.departures.length > 0);
  const dep = stop?.departures[0];
  const bike = glance.bikes[0];
  const dueSoon = myLoans.filter((l) => l.status === "out" && daysBetween(today, l.dueDate) <= 1);
  const overdue = myLoans.filter((l) => l.status === "out" && l.dueDate < today);

  const stats: Stat[] = [
    {
      label: "Prochain cours", icon: Clock, color: "#17a2b8", href: "/agenda",
      value: nextEvent ? timeFmt.format(nextEvent.start) : "–",
      sub: nextEvent ? `${nextEvent.title}${nextEvent.location ? ` · ${nextEvent.location}` : ""}` : user.icalUrl ? "Plus de cours aujourd'hui" : "Ajoute ton lien iCal",
    },
    {
      label: dep ? `Prochain passage (${dep.line})` : "Prochain passage", icon: TramFront, color: "#28a745", href: "/mobilite",
      value: dep ? (dep.minutes[0] <= 0 ? "Imminent" : `${dep.minutes[0]} min`) : "–",
      sub: dep && stop ? `${stop.name} → ${dep.destination}` : home ? "Aucun passage prévu" : "Ajoute ton adresse",
    },
    {
      label: "Prêts à rendre", icon: Package, color: "#f59e0b", href: "/materiel",
      value: String(dueSoon.length),
      sub: overdue.length ? `${overdue.length} en retard` : dueSoon[0] ? `${dueSoon[0].name} · ${daysBetween(today, dueSoon[0].dueDate) <= 0 ? "aujourd'hui" : "demain"}` : "Rien à rendre",
    },
    {
      label: "Vélos disponibles", icon: Bike, color: "#dc3545", href: "/mobilite",
      value: bike ? String(bike.bikes) : "–",
      sub: bike ? `${bike.name} · ${bike.distance} m` : home ? "Aucune station proche" : "Ajoute ton adresse",
    },
  ];

  const shortcuts = [
    { label: "Webmail 3IS", href: s.webmail_url, icon: Mail },
    { label: "Ypareo", href: s.ypareo_url, icon: GraduationCap },
    { label: "Studea", href: s.studea_url, icon: Briefcase },
  ].filter((x) => x.href);

  return (
    <div className="max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Salut {user.name.split(" ")[0]} 👋</h1>
          <p className="text-sm text-muted">Ton hub 3IS : cours, transports, matériel et actus.</p>
        </div>
        {shortcuts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {shortcuts.map(({ label, href, icon: Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs">
                <Icon size={14} /> {label} <ExternalLink size={11} className="text-muted" />
              </a>
            ))}
          </div>
        )}
      </header>

      {!user.onboarded && (
        <div className="card border-accent text-sm">
          Complète ton <Link href="/profil" className="font-medium text-accent underline">profil</Link> : adresse du domicile et lien iCalendar Ypareo pour personnaliser ton espace.
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4" aria-label="En un coup d'œil">
        {stats.map((st) => (
          <Link key={st.label} href={st.href} className="card block hover:border-accent" style={{ borderLeft: `4px solid ${st.color}` }}>
            <span className="grid size-11 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${st.color} 16%, transparent)`, color: st.color }}><st.icon size={22} /></span>
            <div className="mt-4 text-sm text-muted">{st.label}</div>
            <div className="mt-1 text-3xl font-bold">{st.value}</div>
            <div className="mt-1 truncate text-xs text-muted" title={st.sub}>{st.sub}</div>
          </Link>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className={`${section} lg:col-span-2`} style={{ borderTopColor: "var(--accent)" }}>
          <div className="flex items-center justify-between px-5 py-3">
            <h2 className="font-semibold">Aujourd&apos;hui</h2>
            <Link href="/agenda" className="text-xs text-accent underline">Voir la semaine</Link>
          </div>
          {events === null ? (
            <p className="px-5 pb-4 text-sm text-muted">{user.icalUrl ? "Planning indisponible pour le moment." : "Aucun planning relié : ajoute ton lien iCalendar dans ton profil."}</p>
          ) : events.length === 0 ? (
            <p className="px-5 pb-4 text-sm text-muted">Rien de prévu dans ton planning.</p>
          ) : (
            <ul className="divide-y divide-line px-5 pb-2">
              {events.map((e) => (
                <li key={e.id} className="flex items-center gap-4 py-3 text-sm">
                  <span className="w-28 shrink-0 font-medium tabular-nums text-accent">{e.allDay ? "Journée" : `${timeFmt.format(e.start)} – ${timeFmt.format(e.end)}`}</span>
                  <span className="min-w-0 flex-1 font-medium">{e.title}</span>
                  {e.location && <span className="flex items-center gap-1 text-xs text-muted"><MapPin size={12} /> {e.location}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={section} style={{ borderTopColor: "#28a745" }}>
          <div className="flex items-center justify-between px-5 py-3">
            <h2 className="font-semibold">Près de chez toi</h2>
            <Link href="/mobilite" className="text-xs text-accent underline">Détails</Link>
          </div>
          {!home ? (
            <p className="px-5 pb-4 text-sm text-muted">Renseigne ton adresse dans ton <Link href="/profil" className="text-accent underline">profil</Link>.</p>
          ) : glance.stops.length === 0 ? (
            <p className="px-5 pb-4 text-sm text-muted">Horaires indisponibles pour le moment.</p>
          ) : (
            <ul className="space-y-2 px-5 pb-4 text-sm">
              {glance.stops.flatMap((st) => st.departures.slice(0, 2).map((d) => ({ st, d }))).slice(0, 4).map(({ st, d }) => (
                <li key={`${st.name}-${d.line}-${d.destination}`} className="flex items-center gap-3">
                  <span className={`grid min-w-8 place-items-center rounded-md px-2 py-0.5 text-xs font-bold ${d.tram ? "bg-accent text-accent-fg" : "border border-line"}`}>{d.line}</span>
                  <span className="min-w-0 flex-1 truncate text-muted">{d.destination}</span>
                  <span className="font-medium tabular-nums">{d.minutes.slice(0, 2).map((m) => (m <= 0 ? "Imminent" : `${m} min`)).join(" · ")}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${section} lg:col-span-2`} style={{ borderTopColor: "#f59e0b" }}>
          <div className="flex items-center justify-between px-5 py-3">
            <h2 className="font-semibold">Mes prêts de matériel</h2>
            <Link href="/materiel" className="text-xs text-accent underline">Catalogue</Link>
          </div>
          {myLoans.length === 0 ? (
            <p className="px-5 pb-4 text-sm text-muted">Aucun prêt en cours.</p>
          ) : (
            <div className="overflow-x-auto px-5 pb-4">
              <table className="w-full text-left text-sm">
                <thead><tr className="text-xs text-muted"><th className="py-2 font-medium">Matériel</th><th className="font-medium">Retour</th><th className="font-medium">Statut</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {myLoans.map((l) => {
                    const late = l.status === "out" && l.dueDate < today;
                    return (
                      <tr key={l.id}>
                        <td className="py-2.5 font-medium">{l.quantity > 1 && `${l.quantity} × `}{l.name}</td>
                        <td className={late ? "text-danger" : "text-muted"}>
                          {late ? <span className="flex items-center gap-1"><AlertTriangle size={12} /> en retard de {-daysBetween(today, l.dueDate)} j</span> : shortDate.format(new Date(l.dueDate))}
                        </td>
                        <td><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${late ? "bg-danger text-white" : l.status === "out" ? "bg-accent text-accent-fg" : "border border-line text-muted"}`}>{late ? "En retard" : STATUS_LABEL[l.status]}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={section} style={{ borderTopColor: "#17a2b8" }}>
          <div className="flex items-center justify-between px-5 py-3">
            <h2 className="font-semibold">Actualités</h2>
            <Link href="/actus" className="text-xs text-accent underline">Tout voir</Link>
          </div>
          {news.length === 0 ? (
            <p className="px-5 pb-4 text-sm text-muted">Aucune actualité.</p>
          ) : (
            <ul className="space-y-3 px-5 pb-4 text-sm">
              {news.map((n) => (
                <li key={n.id} className="flex items-baseline gap-2">
                  <Link href={`/actus/${n.id}`} className="min-w-0 flex-1 truncate hover:text-accent">{n.pinned && "📌 "}{n.title}</Link>
                  <span className="shrink-0 text-xs text-muted">{ago(n.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
