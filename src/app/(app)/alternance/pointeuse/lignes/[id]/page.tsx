import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { timeEntries } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { todayParis } from "@/lib/equipment";
import { dayLabel, fmtTime } from "@/lib/alternance";
import { TimeEntryForm } from "@/components/time-forms";

export const metadata = { title: "Modifier la ligne" };

export default async function EditTimeEntryPage({ params }: PageProps<"/alternance/pointeuse/lignes/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const [e] = await db.select().from(timeEntries).where(and(eq(timeEntries.id, Number(id)), eq(timeEntries.userId, user.id))).limit(1);
  if (!e) notFound();
  const today = todayParis();

  return (
    <div className="space-y-4">
      <Link href="/alternance/pointeuse/lignes" className="text-sm text-muted hover:text-fg">← Toutes les lignes</Link>
      <h1 className="text-2xl font-bold capitalize">Modifier la ligne du {dayLabel(e.day)}</h1>
      <div className="card">
        <TimeEntryForm today={today} id={e.id} day={e.day} endDay={e.endDay} start={fmtTime(e.startMinutes)} end={fmtTime(e.endMinutes)} pause={e.pauseMinutes} comment={e.comment ?? ""} />
      </div>
    </div>
  );
}
