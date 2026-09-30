import { and, count, desc, eq, inArray, lt, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { bdeEvents, equipmentItems, galleryAlbums, loans, newsPosts, pollInvites, polls, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { STATUS_LABEL, daysBetween, isManager, todayParis } from "@/lib/equipment";
import { ago } from "@/lib/relative-time";
import { cardHref, dueCards } from "@/lib/reminders";
import { AppShell } from "@/components/shell/AppShell";
import { Sidebar } from "@/components/shell/Sidebar";
import { avatarUrl } from "@/lib/avatar-files";
import { NotificationBell, type NotifItem } from "@/components/shell/NotificationBell";
import { QuickTheme } from "@/components/shell/SkinControls";
import { skinFrom } from "@/lib/skin";
import { UserMenu } from "@/components/shell/UserMenu";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const today = todayParis();
  const tomorrow = new Date(`${today}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const limit = tomorrow.toISOString().slice(0, 10);
  const manager = isManager(user);
  const admin = user.perms.administration;

  const [mineDue, requested, lateAll, pendingUsers, news, events, albums, lastLoans, myCards, pollsToAnswer] = await Promise.all([
    // Mes prêts à rendre demain ou en retard (alertes à traiter)
    db
      .select({ id: loans.id, dueDate: loans.dueDate, name: equipmentItems.name })
      .from(loans)
      .innerJoin(equipmentItems, eq(equipmentItems.id, loans.itemId))
      .where(and(eq(loans.userId, user.id), eq(loans.status, "out"), lte(loans.dueDate, limit))),
    // Référents : demandes de prêt à traiter (avec leur date, pour savoir si elles sont nouvelles) et prêts en retard
    manager ? db.select({ at: loans.requestedAt }).from(loans).where(eq(loans.status, "requested")) : Promise.resolve([] as { at: Date }[]),
    manager ? db.select({ n: count() }).from(loans).where(and(eq(loans.status, "out"), lt(loans.dueDate, today))) : Promise.resolve([{ n: 0 }]),
    // Admins : comptes Google en attente de validation
    admin ? db.select({ at: users.createdAt }).from(users).where(eq(users.status, "pending")) : Promise.resolve([] as { at: Date }[]),
    db.select({ id: newsPosts.id, title: newsPosts.title, at: newsPosts.createdAt }).from(newsPosts).orderBy(desc(newsPosts.createdAt)).limit(4),
    db.select({ id: bdeEvents.id, title: bdeEvents.title, at: bdeEvents.createdAt }).from(bdeEvents).orderBy(desc(bdeEvents.createdAt)).limit(3),
    db.select({ id: galleryAlbums.id, title: galleryAlbums.title, at: galleryAlbums.createdAt }).from(galleryAlbums).orderBy(desc(galleryAlbums.createdAt)).limit(3),
    db
      .select({ id: loans.id, status: loans.status, name: equipmentItems.name, at: loans.requestedAt })
      .from(loans)
      .innerJoin(equipmentItems, eq(equipmentItems.id, loans.itemId))
      .where(and(eq(loans.userId, user.id), inArray(loans.status, ["reserved", "rejected", "out", "returned"])))
      .orderBy(desc(loans.requestedAt))
      .limit(2),
    dueCards(limit, user.id), // mes tâches kanban à échéance (aujourd'hui, demain ou en retard)
    // Sondages de disponibilités ouverts auxquels j'ai été invité et que je n'ai pas encore remplis
    db
      .select({ id: polls.id, title: polls.title, at: polls.createdAt })
      .from(pollInvites)
      .innerJoin(polls, eq(polls.id, pollInvites.pollId))
      .where(and(eq(pollInvites.userId, user.id), eq(polls.closed, false), sql`not exists (select 1 from poll_votes pv join poll_options po on po.id = pv.option_id where po.poll_id = ${polls.id} and pv.user_id = ${user.id})`))
      .orderBy(desc(polls.createdAt))
      .limit(4),
  ]);

  const loanBadge = mineDue.length + requested.length + Number(lateAll[0]?.n ?? 0);

  // Nouveautés « lues » = plus anciennes que la dernière ouverture de la cloche (à défaut, la création du compte).
  const seenAt = (user.notifSeenAt ?? user.createdAt).getTime();

  const alerts: NotifItem[] = [
    ...myCards.slice(0, 5).map((c) => ({
      key: `card-${c.cardId}`,
      kind: "alert" as const,
      text: `${c.title} : ${c.dueDate < today ? "en retard" : c.dueDate === today ? "à finir aujourd'hui" : "à finir demain"}`,
      when: c.personal ? "Mon kanban" : c.projectName,
      href: cardHref(c),
      unread: false,
    })),
    ...mineDue.map((l) => {
      const left = daysBetween(today, l.dueDate);
      return {
        key: `due-${l.id}`,
        kind: "alert" as const,
        text: left < 0 ? `${l.name} : en retard de ${-left} j` : left === 0 ? `${l.name} : à rendre aujourd'hui` : `${l.name} : à rendre demain`,
        when: "À traiter",
        href: "/materiel",
        unread: false, // un prêt à rendre reste visible ici mais ne rallume pas la pastille

      };
    }),
    ...(requested.length + Number(lateAll[0]?.n) > 0
      ? [{
          key: "loans-todo",
          kind: "alert" as const,
          text: `${requested.length} demande(s) et ${Number(lateAll[0]?.n)} retard(s) de prêt à traiter`,
          when: "À traiter",
          href: "/materiel/gestion",
          unread: requested.some((r) => r.at.getTime() > seenAt), // nouvelle demande depuis la dernière ouverture
        }]
      : []),
    ...pollsToAnswer.map((p) => ({
      key: `poll-${p.id}`,
      kind: "alert" as const,
      text: `Sondage « ${p.title} » : donne tes disponibilités`,
      when: "À répondre",
      href: `/disponibilites/${p.id}`,
      unread: p.at.getTime() > seenAt,
    })),
    ...(pendingUsers.length > 0
      ? [{
          key: "approvals",
          kind: "approval" as const,
          text: `${pendingUsers.length} compte(s) en attente de validation`,
          when: "À traiter",
          href: "/admin",
          unread: pendingUsers.some((p) => p.at.getTime() > seenAt),
        }]
      : []),
  ];

  const activity = [
    ...news.map((n) => ({ key: `news-${n.id}`, kind: "news" as const, text: `Actu : ${n.title}`, at: n.at, href: `/actus/${n.id}` })),
    ...events.map((e) => ({ key: `bde-${e.id}`, kind: "bde" as const, text: `BDE : ${e.title}`, at: e.at, href: "/bde" })),
    ...albums.map((a) => ({ key: `album-${a.id}`, kind: "gallery" as const, text: `Album « ${a.title} »`, at: a.at, href: `/galerie/${a.id}` })),
    ...lastLoans.map((l) => ({ key: `loan-${l.id}`, kind: "loan" as const, text: `${l.name} : ${STATUS_LABEL[l.status].toLowerCase()}`, at: l.at, href: "/materiel" })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 8)
    .map((a): NotifItem => ({ key: a.key, kind: a.kind, text: a.text, when: ago(a.at), href: a.href, unread: a.at.getTime() > seenAt }));

  const items = [...alerts, ...activity];
  const unread = items.filter((i) => i.unread).length;

  return (
    <AppShell
      sidebar={<Sidebar user={{ name: user.name, email: user.email, roleName: user.roleName, isAdmin: user.perms.administration, views: user.perms.view, avatar: avatarUrl(user.avatarFile) }} loanBadge={loanBadge} />}
      bell={<><QuickTheme initial={skinFrom(user)} /><NotificationBell items={items} unread={unread} /></>}
      menu={<UserMenu name={user.name} email={user.email} isAdmin={admin} />}
    >
      {children}
    </AppShell>
  );
}
