import { asc, count } from "drizzle-orm";
import { db } from "@/db";
import { classes, users } from "@/db/schema";
import { ClassForm } from "@/components/people-forms";

export const metadata = { title: "Promotions" };

export default async function AdminPromotionsPage() {
  const [list, counts] = await Promise.all([
    db.select().from(classes).orderBy(asc(classes.sortOrder), asc(classes.name)),
    db.select({ classId: users.classId, n: count() }).from(users).groupBy(users.classId),
  ]);
  const n = new Map(counts.map((c) => [c.classId, c.n]));
  return (
    <div className="space-y-5">
      <section className="card space-y-3">
        <h2 className="font-semibold">Promotions</h2>
        <p className="text-sm text-muted">Année de début et de fin seulement (ex. 2026-2029). Chaque personne choisit la sienne dans l&apos;onglet Ma promo de son profil.</p>
        <ul className="divide-y divide-line">
          {list.map((c) => (
            <li key={c.id} className="space-y-1 py-3">
              <ClassForm cls={c} />
              <p className="text-xs text-muted">{n.get(c.id) ?? 0} personne{(n.get(c.id) ?? 0) > 1 ? "s" : ""}</p>
            </li>
          ))}
          {list.length === 0 && <li className="py-3 text-sm text-muted">Aucune promotion pour le moment.</li>}
        </ul>
      </section>
      <section className="card space-y-3">
        <h2 className="font-semibold">Ajouter une promotion</h2>
        <ClassForm />
      </section>
    </div>
  );
}
