import { timingSafeEqual } from "node:crypto";
import { and, eq, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { equipmentItems, loans, users } from "@/db/schema";
import { daysBetween, todayParis } from "@/lib/equipment";
import { notifyUser } from "@/lib/push";

// Appelé une fois par jour (cron / timer systemd) avec l'en-tête  Authorization: Bearer <CRON_SECRET>.
// Envoie un rappel aux emprunteurs dont le matériel est à rendre bientôt ou en retard,
// et un résumé aux référents matériel quand des prêts sont en retard.
function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer /i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function run(req: Request) {
  if (!authorized(req)) return Response.json({ error: "Non autorisé" }, { status: 401 });
  const today = todayParis();
  const tomorrow = new Date(`${today}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const limit = tomorrow.toISOString().slice(0, 10);

  const due = await db
    .select({ userId: loans.userId, dueDate: loans.dueDate, quantity: loans.quantity, name: equipmentItems.name })
    .from(loans)
    .innerJoin(equipmentItems, eq(equipmentItems.id, loans.itemId))
    .where(and(eq(loans.status, "out"), lte(loans.dueDate, limit)));

  let borrowers = 0;
  for (const l of due) {
    const left = daysBetween(today, l.dueDate);
    const what = `${l.quantity > 1 ? `${l.quantity} × ` : ""}${l.name}`;
    const body = left < 0 ? `${what} : en retard de ${-left} jour(s), à rapporter dès que possible.` : left === 0 ? `${what} : à rendre aujourd'hui.` : `${what} : à rendre demain.`;
    borrowers += await notifyUser(l.userId, { title: "Matériel à rendre", body, url: "/materiel", tag: `loan-${l.userId}-${l.name}` }, "loans");
  }

  const overdue = due.filter((l) => l.dueDate < today).length;
  let managers = 0;
  if (overdue > 0) {
    const staff = await db.select({ id: users.id }).from(users).where(inArray(users.role, ["admin", "materiel"]));
    for (const s of staff) {
      managers += await notifyUser(s.id, { title: "Prêts en retard", body: `${overdue} prêt(s) de matériel en retard.`, url: "/materiel/gestion", tag: "loans-overdue" }, "loans");
    }
  }
  return Response.json({ ok: true, loansConcerned: due.length, overdue, notifiedBorrowers: borrowers, notifiedManagers: managers });
}

export const GET = run;
export const POST = run;
