import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { pollInvites, pollOptions, pollVotes, polls, tracks, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { absoluteUrl } from "@/lib/base-url";
import { slotLabel } from "@/lib/poll-shared";
import { CopyButton } from "@/components/people-forms";
import { PollManage, PollVote, type VoteOption } from "@/components/poll-forms";

export async function generateMetadata({ params }: PageProps<"/disponibilites/[id]">) {
  const [p] = await db.select({ title: polls.title }).from(polls).where(eq(polls.id, Number((await params).id))).limit(1);
  return { title: p ? `Sondage : ${p.title}` : "Sondage" };
}

export default async function PollPage({ params }: PageProps<"/disponibilites/[id]">) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [poll] = await db.select({ p: polls, creator: users.name }).from(polls).innerJoin(users, eq(users.id, polls.creatorId)).where(eq(polls.id, id)).limit(1);
  if (!poll) notFound();

  const options = await db.select().from(pollOptions).where(eq(pollOptions.pollId, id)).orderBy(asc(pollOptions.startsAt));
  const optIds = options.map((o) => o.id);
  const [votes, invites] = await Promise.all([
    optIds.length ? db.select({ optionId: pollVotes.optionId, userId: pollVotes.userId, answer: pollVotes.answer, name: users.name }).from(pollVotes).innerJoin(users, eq(users.id, pollVotes.userId)).where(inArray(pollVotes.optionId, optIds)) : [],
    db.select({ id: users.id, name: users.name }).from(pollInvites).innerJoin(users, eq(users.id, pollInvites.userId)).where(eq(pollInvites.pollId, id)),
  ]);

  const rows: VoteOption[] = options.map((o) => {
    const v = votes.filter((x) => x.optionId === o.id);
    return {
      id: o.id, label: slotLabel(o.startsAt, o.endsAt),
      yes: v.filter((x) => x.answer === "yes").map((x) => x.name), maybe: v.filter((x) => x.answer === "maybe").map((x) => x.name), no: v.filter((x) => x.answer === "no").map((x) => x.name),
      mine: v.find((x) => x.userId === user.id)?.answer ?? null, best: false, final: poll.p.finalOptionId === o.id,
    };
  });
  // Le créneau le plus plébiscité : le plus de « disponible », puis le plus de « peut-être ».
  const top = rows.reduce<VoteOption | null>((b, r) => (!b || r.yes.length > b.yes.length || (r.yes.length === b.yes.length && r.maybe.length > b.maybe.length) ? r : b), null);
  if (top && top.yes.length + top.maybe.length > 0) for (const r of rows) r.best = r.yes.length === top.yes.length && r.maybe.length === top.maybe.length;

  const answeredIds = new Set(votes.map((v) => v.userId));
  const canManage = poll.p.creatorId === user.id || user.perms.administration;
  let people: { id: number; name: string; trackId: number | null; track: string | null }[] = [];
  if (canManage && !poll.p.closed) {
    const [us, ts] = await Promise.all([db.select({ id: users.id, name: users.name, trackId: users.trackId }).from(users).where(and(eq(users.status, "active"), ne(users.id, user.id))).orderBy(asc(users.lastName), asc(users.firstName)), db.select().from(tracks)]);
    const tn = new Map(ts.map((t) => [t.id, t.name]));
    const already = new Set(invites.map((i) => i.id));
    people = us.filter((u) => !already.has(u.id)).map((u) => ({ id: u.id, name: u.name, trackId: u.trackId, track: u.trackId ? tn.get(u.trackId) ?? null : null }));
  }
  const url = await absoluteUrl(`/disponibilites/${id}`);

  return (
    <div className="max-w-3xl space-y-5">
      <header className="space-y-1">
        <p className="text-sm"><Link href="/disponibilites" className="text-muted underline">← Disponibilités</Link></p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{poll.p.title}</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${poll.p.closed ? "border border-line text-muted" : "bg-accent text-accent-fg"}`}>{poll.p.closed ? "Clos" : "Ouvert"}</span>
        </div>
        <p className="text-sm text-muted">Proposé par {poll.creator}{answeredIds.size > 0 ? ` · ${answeredIds.size} réponse${answeredIds.size > 1 ? "s" : ""}` : ""}</p>
        {poll.p.description && <p className="whitespace-pre-line text-sm">{poll.p.description}</p>}
      </header>

      <PollVote key={`${id}-${poll.p.closed}`} pollId={id} options={rows} closed={poll.p.closed} />

      <div className="card space-y-3">
        <h2 className="font-semibold">Partager</h2>
        <p className="break-all rounded-lg border border-line bg-bg px-3 py-2 text-sm">{url}</p>
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton value={url} label="Copier le lien" />
          <span className="text-xs text-muted">Il faut être connecté à Backstage pour répondre.</span>
        </div>
        {invites.length > 0 && (
          <p className="text-sm text-muted">
            Invités : {invites.map((i, k) => <span key={i.id}>{k > 0 ? ", " : ""}<span className={answeredIds.has(i.id) ? "text-fg" : ""}>{i.name}{answeredIds.has(i.id) ? " ✓" : ""}</span></span>)}
          </p>
        )}
      </div>

      {canManage && <PollManage pollId={id} closed={poll.p.closed} options={rows.map((r) => ({ id: r.id, label: r.label }))} people={people} myTrackId={user.trackId} />}
    </div>
  );
}
