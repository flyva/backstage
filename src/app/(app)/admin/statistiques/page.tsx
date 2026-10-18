import Link from "next/link";
import { desc } from "drizzle-orm";
import { Activity, Clock, Laptop, Smartphone, UserCheck, Users } from "lucide-react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ago } from "@/lib/relative-time";
import { Avatar } from "@/components/people-forms";
import { avatarUrl } from "@/lib/avatar-files";
import { deviceTotals, topPages } from "@/lib/stats-actions";

export const metadata = { title: "Statistiques" };
export const dynamic = "force-dynamic";

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number | string }) {
  return (
    <div className="card flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><Icon size={18} aria-hidden /></span>
      <div><div className="text-2xl font-bold tabular-nums">{value}</div><div className="text-xs text-muted">{label}</div></div>
    </div>
  );
}

export default async function StatisticsPage() {
  const all = await db.select({ id: users.id, name: users.name, avatar: users.avatarFile, status: users.status, lastSeenAt: users.lastSeenAt, createdAt: users.createdAt }).from(users).orderBy(desc(users.lastSeenAt));
  const active = all.filter((u) => u.status === "active");
  const now = new Date().getTime();
  const since = (ms: number) => active.filter((u) => u.lastSeenAt && now - u.lastSeenAt.getTime() < ms).length;
  const today = since(24 * 3600e3);
  const week = since(7 * 24 * 3600e3);
  const month = since(30 * 24 * 3600e3);
  const neverSeen = active.filter((u) => !u.lastSeenAt);
  const [pages, devices] = await Promise.all([topPages(20), deviceTotals()]);
  const totalVisits = devices.mobile + devices.desktop;
  const mobilePct = totalVisits ? Math.round((devices.mobile / totalVisits) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label="Comptes actifs" value={active.length} />
        <Stat icon={Activity} label="Vus aujourd'hui" value={today} />
        <Stat icon={UserCheck} label="Vus cette semaine" value={week} />
        <Stat icon={Clock} label="Vus ce mois-ci" value={month} />
      </div>

      {neverSeen.length > 0 && (
        <section className="card space-y-2">
          <h2 className="font-semibold">Jamais vus sur l&apos;appli ({neverSeen.length})</h2>
          <p className="text-sm text-muted">Compte créé mais jamais utilisé depuis que les statistiques existent.</p>
          <ul className="flex flex-wrap gap-2">
            {neverSeen.map((u) => (
              <li key={u.id}><Link href={`/admin/utilisateurs/${u.id}`} className="rounded-full border border-line px-3 py-1 text-sm hover:border-accent">{u.name}</Link></li>
            ))}
          </ul>
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="font-semibold">Pages les plus utilisées</h2>
        {totalVisits > 0 && (
          <p className="flex items-center gap-4 text-sm text-muted">
            <span className="flex items-center gap-1.5"><Smartphone size={14} /> {devices.mobile} visites sur téléphone ({mobilePct}%)</span>
            <span className="flex items-center gap-1.5"><Laptop size={14} /> {devices.desktop} visites sur ordinateur ({100 - mobilePct}%)</span>
          </p>
        )}
        {pages.length === 0 ? (
          <p className="text-sm text-muted">Pas encore de données (comptées depuis l&apos;ajout de cette statistique).</p>
        ) : (
          <ul className="divide-y divide-line">
            {pages.map((p) => (
              <li key={p.path} className="flex items-center gap-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{p.path}</span>
                <span className="shrink-0 tabular-nums font-medium">{p.total}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
                  <span className="flex items-center gap-1"><Smartphone size={12} /> {p.mobile}</span>
                  <span className="flex items-center gap-1"><Laptop size={12} /> {p.desktop}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card space-y-1">
        <h2 className="mb-2 font-semibold">Dernière activité, par personne</h2>
        <ul className="divide-y divide-line">
          {all.map((u) => (
            <li key={u.id} className="flex items-center gap-3 py-2">
              <Avatar name={u.name} url={avatarUrl(u.avatar)} size={32} />
              <Link href={`/admin/utilisateurs/${u.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-accent">{u.name}</Link>
              {u.status !== "active" && <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs text-muted">{u.status === "pending" ? "en attente" : u.status === "disabled" ? "désactivé" : "refusé"}</span>}
              <span className="shrink-0 text-xs text-muted">{u.lastSeenAt ? ago(u.lastSeenAt) : "jamais"}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
