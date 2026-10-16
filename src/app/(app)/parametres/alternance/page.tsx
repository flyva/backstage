import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { TimeSettingsForm } from "@/components/time-forms";

export const metadata = { title: "Alternance · Paramètres" };

export default async function AlternanceSettingsPage() {
  const user = await requireUser();
  const colleagues = await db.select({ id: users.id, name: users.name }).from(users).where(and(ne(users.id, user.id), eq(users.status, "active"))).orderBy(users.name);

  return (
    <div className="space-y-5">
      <section className="card space-y-4">
        <div>
          <h2 className="font-semibold">Pointeuse</h2>
          <p className="text-sm text-muted">La durée standard sert à calculer tes heures sup. Le référent voit ta pointeuse et tes statistiques en lecture seule.</p>
        </div>
        <TimeSettingsForm standardHours={user.standardWorkMinutes / 60} workDaysPerWeek={user.workDaysPerWeek} tutorUserId={user.tutorUserId} colleagues={colleagues} />
      </section>
    </div>
  );
}
