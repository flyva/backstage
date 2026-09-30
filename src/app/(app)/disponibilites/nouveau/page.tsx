import Link from "next/link";
import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { tracks, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PollForm } from "@/components/poll-forms";

export const metadata = { title: "Nouveau sondage" };

export default async function NewPollPage() {
  const user = await requireUser();
  const [rows, allTracks] = await Promise.all([
    db.select({ id: users.id, name: users.name, trackId: users.trackId }).from(users).where(and(eq(users.status, "active"), ne(users.id, user.id))).orderBy(asc(users.lastName), asc(users.firstName)),
    db.select().from(tracks),
  ]);
  const trackName = new Map(allTracks.map((t) => [t.id, t.name]));
  const people = rows.map((r) => ({ id: r.id, name: r.name, trackId: r.trackId, track: r.trackId ? trackName.get(r.trackId) ?? null : null }));
  return (
    <div className="max-w-3xl space-y-5">
      <header>
        <p className="text-sm"><Link href="/disponibilites" className="text-muted underline">← Disponibilités</Link></p>
        <h1 className="text-2xl font-bold">Nouveau sondage</h1>
      </header>
      <div className="card"><PollForm people={people} myTrackId={user.trackId} /></div>
    </div>
  );
}
