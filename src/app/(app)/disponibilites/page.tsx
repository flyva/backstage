import Link from "next/link";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { CalendarClock, Plus } from "lucide-react";
import { db } from "@/db";
import { pollInvites, pollOptions, pollVotes, polls, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ago } from "@/lib/relative-time";

export const metadata = { title: "Disponibilités" };

type Row = { id: number; title: string; closed: boolean; creator: string; createdAt: Date };

function PollList({ rows, answers, empty }: { rows: Row[]; answers: Map<number, number>; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line">
      {rows.map((p) => (
        <li key={p.id}>
          <Link href={`/disponibilites/${p.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 hover:text-accent">
            <span className="min-w-0 flex-1 truncate font-medium">{p.title}</span>
            <span className="text-xs text-muted">{p.creator} · {ago(p.createdAt)}</span>
            <span className="text-xs text-muted">{answers.get(p.id) ?? 0} réponse{(answers.get(p.id) ?? 0) > 1 ? "s" : ""}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.closed ? "border border-line text-muted" : "bg-accent text-accent-fg"}`}>{p.closed ? "Clos" : "Ouvert"}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function DisponibilitesPage() {
  const user = await requireUser();
  const pick = { id: polls.id, title: polls.title, closed: polls.closed, creator: users.name, createdAt: polls.createdAt };
  const myVotedPolls = db.selectDistinct({ id: pollOptions.pollId }).from(pollVotes).innerJoin(pollOptions, eq(pollOptions.id, pollVotes.optionId)).where(eq(pollVotes.userId, user.id));

  const [mine, invitedRows, voted] = await Promise.all([
    db.select(pick).from(polls).innerJoin(users, eq(users.id, polls.creatorId)).where(eq(polls.creatorId, user.id)).orderBy(desc(polls.createdAt)).limit(50),
    db.select(pick).from(pollInvites).innerJoin(polls, eq(polls.id, pollInvites.pollId)).innerJoin(users, eq(users.id, polls.creatorId)).where(eq(pollInvites.userId, user.id)).orderBy(desc(polls.createdAt)).limit(50),
    db.select(pick).from(polls).innerJoin(users, eq(users.id, polls.creatorId)).where(and(inArray(polls.id, myVotedPolls), sql`${polls.creatorId} <> ${user.id}`)).orderBy(desc(polls.createdAt)).limit(50),
  ]);
  const votedIds = new Set((await myVotedPolls).map((r) => r.id));
  const toAnswer = invitedRows.filter((p) => !p.closed && !votedIds.has(p.id));
  const answered = [...voted, ...invitedRows.filter((p) => votedIds.has(p.id) && !voted.some((v) => v.id === p.id))].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const allIds = [...new Set([...mine, ...invitedRows, ...voted].map((p) => p.id))];
  const counts = allIds.length
    ? await db.select({ pollId: pollOptions.pollId, n: sql<number>`count(distinct ${pollVotes.userId})` }).from(pollVotes).innerJoin(pollOptions, eq(pollOptions.id, pollVotes.optionId)).where(inArray(pollOptions.pollId, allIds)).groupBy(pollOptions.pollId)
    : [];
  const answers = new Map(counts.map((c) => [c.pollId, Number(c.n)]));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><CalendarClock size={24} className="text-accent" /> Disponibilités</h1>
          <p className="text-sm text-muted">Propose des créneaux, invite des personnes de la promo et vois qui est libre quand.</p>
        </div>
        <Link href="/disponibilites/nouveau" className="btn"><Plus size={16} /> Nouveau sondage</Link>
      </header>

      {toAnswer.length > 0 && (
        <section className="card space-y-2 border-accent">
          <h2 className="font-semibold">À toi de répondre ({toAnswer.length})</h2>
          <PollList rows={toAnswer} answers={answers} empty="" />
        </section>
      )}
      <section className="card space-y-2">
        <h2 className="font-semibold">Mes sondages</h2>
        <PollList rows={mine} answers={answers} empty="Tu n'as créé aucun sondage." />
      </section>
      <section className="card space-y-2">
        <h2 className="font-semibold">Sondages auxquels j&apos;ai répondu</h2>
        <PollList rows={answered} answers={answers} empty="Aucun pour le moment." />
      </section>
    </div>
  );
}
