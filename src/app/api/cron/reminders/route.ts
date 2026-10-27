import { timingSafeEqual } from "node:crypto";
import { and, eq, inArray, isNotNull, isNull, lt, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { altCompanies, altCompanySearches, equipmentItems, loans, roles, timeEntries, users, workDays } from "@/db/schema";
import { addDays, weekday } from "@/lib/alternance";
import { daysBetween, todayParis } from "@/lib/equipment";
import { publicBaseUrl, sendMail } from "@/lib/mail";
import { notifyUser } from "@/lib/push";
import { cardHref, dueCards } from "@/lib/reminders";

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
    const staff = await db.select({ id: users.id }).from(users).innerJoin(roles, eq(roles.id, users.roleId)).where(or(eq(roles.isAdmin, true), eq(roles.permMateriel, true)));
    for (const s of staff) {
      managers += await notifyUser(s.id, { title: "Prêts en retard", body: `${overdue} prêt(s) de matériel en retard.`, url: "/materiel/gestion", tag: "loans-overdue" }, "loans");
    }
  }
  // Rappels de tâches (kanban) : un seul message par personne, avec les échéances du jour, de demain et les retards.
  const cards = await dueCards(limit);
  const byUser = Map.groupBy(cards, (c) => c.userId);
  let reminded = 0;
  for (const [uid, list] of byUser) {
    const late = list.filter((c) => c.dueDate < today).length;
    const todayN = list.filter((c) => c.dueDate === today).length;
    const tomorrowN = list.filter((c) => c.dueDate > today).length;
    const parts = [late && `${late} en retard`, todayN && `${todayN} pour aujourd'hui`, tomorrowN && `${tomorrowN} pour demain`].filter(Boolean).join(", ");
    const names = list.slice(0, 3).map((c) => c.title).join(" · ");
    reminded += await notifyUser(uid, { title: "Tâches à finir", body: `${parts} : ${names}${list.length > 3 ? "…" : ""}`, url: cardHref(list[0]), tag: `due-${uid}` }, "reminders");
  }

  // Rappel de la veille : « Demain : entreprise / école » (d'après le planning de l'alternance).
  const plan = await db.select({ userId: workDays.userId, kind: workDays.kind }).from(workDays).where(and(eq(workDays.day, limit), inArray(workDays.kind, ["ecole", "entreprise"])));
  let planned = 0;
  for (const p of plan) {
    planned += await notifyUser(p.userId, { title: "Demain", body: p.kind === "ecole" ? "Demain : journée à l'école." : "Demain : journée en entreprise.", url: "/alternance", tag: `plan-${p.userId}` }, "reminders");
  }

  // Rappel « rien pointé » (facultatif, décoché par défaut) : jour ouvré d'hier sans école/congé/maladie planifiés et sans aucune ligne de pointeuse saisie.
  const yesterday = addDays(today, -1);
  let emptyPointeuse = 0;
  if (weekday(yesterday) < 5) { // au-delà, la plupart des gens sont en repos de toute façon ; le vrai filtre est workDaysPerWeek, vérifié ensuite
    const optedIn = await db.select({ id: users.id, workDaysPerWeek: users.workDaysPerWeek }).from(users).where(and(eq(users.status, "active"), eq(users.notifyEmptyPointeuse, true)));
    const candidates = optedIn.filter((u) => weekday(yesterday) < u.workDaysPerWeek);
    if (candidates.length > 0) {
      const ids = candidates.map((u) => u.id);
      const [planned2, logged] = await Promise.all([
        db.select({ userId: workDays.userId }).from(workDays).where(and(inArray(workDays.userId, ids), eq(workDays.day, yesterday), inArray(workDays.kind, ["ecole", "conge", "maladie"]))),
        db.select({ userId: timeEntries.userId }).from(timeEntries).where(and(inArray(timeEntries.userId, ids), eq(timeEntries.day, yesterday))),
      ]);
      const covered = new Set([...planned2.map((p) => p.userId), ...logged.map((l) => l.userId)]);
      for (const u of candidates) {
        if (covered.has(u.id)) continue;
        emptyPointeuse += await notifyUser(u.id, { title: "Pointeuse", body: "Rien n'a été pointé hier : pense à compléter ta pointeuse si tu as travaillé.", url: "/alternance/pointeuse", tag: `empty-pointeuse-${u.id}` }, "reminders");
      }
    }
  }

  // Recherche entreprises : « délais » dépassé (lastContactDate + delayDays) → la ligne passe en rouge côté app, et un
  // rappel (push + mail) part UNE fois (delayAlertSentAt), remis à zéro si la personne change la date ou le délai.
  const dueSearches = await db
    .select({
      id: altCompanySearches.id, userId: altCompanySearches.userId, lastContactDate: altCompanySearches.lastContactDate,
      delayDays: altCompanySearches.delayDays, companyName: altCompanies.name, email: users.email,
    })
    .from(altCompanySearches)
    .innerJoin(altCompanies, eq(altCompanies.id, altCompanySearches.companyId))
    .innerJoin(users, eq(users.id, altCompanySearches.userId))
    .where(and(isNotNull(altCompanySearches.lastContactDate), isNotNull(altCompanySearches.delayDays), isNull(altCompanySearches.delayAlertSentAt)));

  let delayAlerts = 0;
  const base = publicBaseUrl();
  for (const s of dueSearches) {
    const due = addDays(s.lastContactDate!, s.delayDays!);
    if (due > today) continue;
    const body = `${s.companyName} : relance en retard (prévue le ${due}).`;
    await notifyUser(s.userId, { title: "Relance en retard", body, url: "/recherche-entreprises", tag: `alt-delay-${s.id}` }, "reminders");
    if (s.email) {
      const link = base ? `${base}/recherche-entreprises` : "/recherche-entreprises";
      await sendMail(s.email, "Relance en retard — Recherche entreprises", body, `<p>${body}</p><p><a href="${link}">Voir mon tableau</a></p>`);
    }
    await db.update(altCompanySearches).set({ delayAlertSentAt: new Date() }).where(eq(altCompanySearches.id, s.id));
    delayAlerts++;
  }

  // Purge RGPD : les comptes jamais activés ne doivent pas s'accumuler indéfiniment (voir Admin > RGPD).
  const RETENTION = { rejected: 90, pending: 180 }; // jours depuis la création
  const purged = { rejected: 0, pending: 0 };
  for (const [status, days] of Object.entries(RETENTION) as [keyof typeof RETENTION, number][]) {
    const cutoff = new Date(`${addDays(today, -days)}T00:00:00Z`);
    const old = await db.select({ id: users.id }).from(users).where(and(eq(users.status, status), lt(users.createdAt, cutoff)));
    for (const u of old) {
      try { await db.delete(users).where(eq(users.id, u.id)); purged[status]++; } catch { /* a rejeté/en attente ne devrait jamais avoir de contenu, mais au cas où : on laisse ce compte-là */ }
    }
  }

  return Response.json({ ok: true, remindedTasks: reminded, remindedPlanning: planned, loansConcerned: due.length, overdue, notifiedBorrowers: borrowers, notifiedManagers: managers, remindedEmptyPointeuse: emptyPointeuse, delayAlerts, purged });
}

export const GET = run;
export const POST = run;
