import Link from "next/link";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { equipmentItems, loans, users } from "@/db/schema";
import { requireManager, todayParis } from "@/lib/equipment";
import { AddItemForm } from "@/components/equipment-forms";
import { LoanCard, type LoanView } from "@/components/LoanCard";

export const metadata = { title: "Gestion du matériel" };

export default async function GestionPage() {
  await requireManager();
  const today = todayParis();

  const rows = await db
    .select({ loan: loans, itemName: equipmentItems.name, borrower: users.name })
    .from(loans)
    .innerJoin(equipmentItems, eq(equipmentItems.id, loans.itemId))
    .innerJoin(users, eq(users.id, loans.userId))
    .where(inArray(loans.status, ["requested", "reserved", "out"]))
    .orderBy(asc(loans.dueDate));
  const views: LoanView[] = rows.map((r) => ({ ...r.loan, itemName: r.itemName, borrower: r.borrower }));

  const overdue = views.filter((l) => l.status === "out" && l.dueDate < today);
  const requested = views.filter((l) => l.status === "requested");
  const reserved = views.filter((l) => l.status === "reserved");
  const out = views.filter((l) => l.status === "out" && l.dueDate >= today);

  const items = await db.select().from(equipmentItems).orderBy(asc(equipmentItems.category), asc(equipmentItems.name));
  const recent = await db
    .select({ loan: loans, itemName: equipmentItems.name, borrower: users.name })
    .from(loans)
    .innerJoin(equipmentItems, eq(equipmentItems.id, loans.itemId))
    .innerJoin(users, eq(users.id, loans.userId))
    .where(inArray(loans.status, ["returned", "rejected", "cancelled"]))
    .orderBy(desc(loans.requestedAt))
    .limit(10);

  const groups: [string, LoanView[]][] = [
    ["En retard", overdue],
    ["Demandes à traiter", requested],
    ["Validés, à remettre", reserved],
    ["Actuellement sortis", out],
  ];

  return (
    <div className="max-w-4xl space-y-8">
      <header>
        <Link href="/materiel" className="text-sm text-muted hover:text-fg">← Catalogue</Link>
        <h1 className="text-2xl font-bold">Gestion du matériel</h1>
      </header>

      {groups.map(([title, list]) =>
        list.length === 0 ? null : (
          <section key={title} className="space-y-2">
            <h2 className={`font-semibold ${title === "En retard" ? "text-danger" : ""}`}>{title} ({list.length})</h2>
            <ul className="space-y-2">{list.map((l) => <LoanCard key={l.id} manager loan={l} />)}</ul>
          </section>
        ),
      )}
      {views.length === 0 && <p className="text-sm text-muted">Aucun prêt en cours ni demande en attente.</p>}

      <section className="space-y-2">
        <h2 className="font-semibold">Inventaire ({items.length})</h2>
        {items.length === 0 && <p className="text-sm text-muted">Le catalogue est vide : ajoute le premier objet ci-dessous.</p>}
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface text-sm">
          {items.map((i) => (
            <li key={i.id}>
              <Link href={`/materiel/${i.id}`} className="flex items-center gap-3 px-3 py-2 hover:bg-bg">
                <span className="min-w-0 flex-1 truncate">
                  <span className="text-muted">{i.category} · </span>{i.name}
                </span>
                {i.code && <span className="font-mono text-xs text-muted">{i.code}</span>}
                <span className="text-xs tabular-nums text-muted">×{i.quantity}</span>
                {i.status !== "active" && <span className="text-xs text-muted">({i.status === "maintenance" ? "maintenance" : "retiré"})</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Ajouter du matériel</h2>
        <AddItemForm />
      </section>

      {recent.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold text-muted">Derniers prêts terminés</h2>
          <ul className="space-y-2">
            {recent.map((r) => <LoanCard key={r.loan.id} loan={{ ...r.loan, itemName: r.itemName, borrower: r.borrower }} />)}
          </ul>
        </section>
      )}
    </div>
  );
}
