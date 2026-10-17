import Link from "next/link";
import { desc } from "drizzle-orm";
import { Activity, Clock, UserCheck, Users } from "lucide-react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ago } from "@/lib/relative-time";
import { Avatar } from "@/components/people-forms";
import { avatarUrl } from "@/lib/avatar-files";

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
