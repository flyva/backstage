import { cookies } from "next/headers";
import { and, count, desc, eq, inArray, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { bdeEvents, equipmentItems, galleryAlbums, loans, newsPosts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { isManager, todayParis } from "@/lib/equipment";
import { ago } from "@/lib/relative-time";
import { skinFrom } from "@/lib/skin";
import { AppShell } from "@/components/shell/AppShell";
import { Sidebar } from "@/components/shell/Sidebar";
import { RightPanel, type ActivityItem } from "@/components/shell/RightPanel";
import { STATUS_LABEL } from "@/lib/equipment";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const jar = await cookies();
  // Le skin affiché vient des cookies (comme <html>) : le panneau montre donc exactement ce qui est appliqué.
  const skin = skinFrom({ theme: jar.get("theme")?.value, accent: jar.get("accent")?.value, sidebar: jar.get("sidebar")?.value });

  const today = todayParis();
  const tomorrow = new Date(`${today}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const limit = tomorrow.toISOString().slice(0, 10);
  const manager = isManager(user);

  const [mineDue, todoRows, news, events, albums, lastLoan, settings] = await Promise.all([
    // Mes prêts à rendre demain ou en retard
    db.select({ n: count() }).from(loans).where(and(eq(loans.userId, user.id), eq(loans.status, "out"), lte(loans.dueDate, limit))),
    // Référents : demandes à traiter + prêts en retard
    manager
      ? db.select({ n: count() }).from(loans).where(or(eq(loans.status, "requested"), and(eq(loans.status, "out"), lte(loans.dueDate, `${today}`))))
      : Promise.resolve([{ n: 0 }]),
    db.select({ id: newsPosts.id, title: newsPosts.title, at: newsPosts.createdAt }).from(newsPosts).orderBy(desc(newsPosts.createdAt)).limit(2),
    db.select({ id: bdeEvents.id, title: bdeEvents.title, at: bdeEvents.createdAt }).from(bdeEvents).orderBy(desc(bdeEvents.createdAt)).limit(1),
    db.select({ id: galleryAlbums.id, title: galleryAlbums.title, at: galleryAlbums.createdAt }).from(galleryAlbums).orderBy(desc(galleryAlbums.createdAt)).limit(1),
    db
      .select({ id: loans.id, status: loans.status, name: equipmentItems.name, at: loans.requestedAt })
      .from(loans)
      .innerJoin(equipmentItems, eq(equipmentItems.id, loans.itemId))
      .where(and(eq(loans.userId, user.id), inArray(loans.status, ["reserved", "rejected", "out", "returned"])))
      .orderBy(desc(loans.requestedAt))
      .limit(1),
    getSettings(),
  ]);

  const loanBadge = Number(mineDue[0]?.n ?? 0) + Number(todoRows[0]?.n ?? 0);

  const activity: (ActivityItem & { at: Date })[] = [
    ...news.map((n) => ({ key: `news-${n.id}`, kind: "news" as const, text: `Actu : ${n.title}`, at: n.at, when: "", href: `/actus/${n.id}` })),
    ...events.map((e) => ({ key: `bde-${e.id}`, kind: "bde" as const, text: `BDE : ${e.title}`, at: e.at, when: "", href: "/bde" })),
    ...albums.map((a) => ({ key: `album-${a.id}`, kind: "gallery" as const, text: `Album « ${a.title} »`, at: a.at, when: "", href: `/galerie/${a.id}` })),
    ...lastLoan.map((l) => ({ key: `loan-${l.id}`, kind: "loan" as const, text: `${l.name} : ${STATUS_LABEL[l.status].toLowerCase()}`, at: l.at, when: "", href: "/materiel" })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 5)
    .map((a) => ({ ...a, when: ago(a.at) }));

  return (
    <AppShell
      skin={skin}
      sidebar={<Sidebar user={{ name: user.name, email: user.email, role: user.role }} loanBadge={loanBadge} />}
      panel={<RightPanel skin={skin} activity={activity} hasWifi={!!settings.wifi_ssid} />}
    >
      {children}
    </AppShell>
  );
}
