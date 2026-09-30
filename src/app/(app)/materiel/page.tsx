import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Settings2 } from "lucide-react";
import { db } from "@/db";
import { equipmentItems, loans } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { availabilityForAll, isManager, todayParis } from "@/lib/equipment";
import { LoanCard } from "@/components/LoanCard";

export const metadata = { title: "Matériel" };

export default async function MaterielPage({ searchParams }: PageProps<"/materiel">) {
  const user = await requireModule("materiel");
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().toLowerCase();
  const cat = typeof sp.cat === "string" ? sp.cat : "";

  const today = todayParis();
  const [all, mine] = await Promise.all([
    availabilityForAll(today, today),
    db
      .select({ loan: loans, itemName: equipmentItems.name })
      .from(loans)
      .innerJoin(equipmentItems, eq(equipmentItems.id, loans.itemId))
      .where(eq(loans.userId, user.id))
      .orderBy(desc(loans.requestedAt))
      .limit(30),
  ]);

  const categories = [...new Set(all.map((x) => x.item.category))].sort();
  const catalogue = all
    .filter(({ item }) => item.status !== "retired")
    .filter(({ item }) => !cat || item.category === cat)
    .filter(({ item }) => !q || `${item.name} ${item.code ?? ""} ${item.description ?? ""}`.toLowerCase().includes(q))
    .sort((a, b) => a.item.category.localeCompare(b.item.category) || a.item.name.localeCompare(b.item.name));

  const active = mine.filter((m) => ["requested", "reserved", "out"].includes(m.loan.status));
  const past = mine.filter((m) => !active.includes(m)).slice(0, 5);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Matériel de l&apos;école</h1>
          <p className="text-sm text-muted">Emprunte du matériel pour tes projets, avec une date de retour.</p>
        </div>
        {isManager(user) && (
          <Link href="/materiel/gestion" className="btn-ghost"><Settings2 size={16} /> Gestion</Link>
        )}
      </header>

      {active.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Mes prêts en cours</h2>
          <ul className="space-y-2">
            {active.map(({ loan, itemName }) => <LoanCard key={loan.id} mine loan={{ ...loan, itemName }} />)}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Catalogue</h2>
        <form className="flex flex-wrap gap-2" role="search">
          <input name="q" defaultValue={q} placeholder="Rechercher (nom, repère)…" aria-label="Rechercher" className="input min-w-48 flex-1" />
          <select name="cat" defaultValue={cat} aria-label="Catégorie" className="input w-auto">
            <option value="">Toutes les catégories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn-ghost">Filtrer</button>
        </form>

        {catalogue.length === 0 ? (
          <p className="text-sm text-muted">Aucun matériel trouvé.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {catalogue.map(({ item, available }) => (
              <Link key={item.id} href={`/materiel/${item.id}`} className="card space-y-1 hover:border-accent">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium leading-snug">{item.name}</h3>
                  <span
                    className={`shrink-0 rounded-md border px-1.5 py-0.5 text-xs tabular-nums ${
                      item.status !== "active" ? "border-line text-muted" : available > 0 ? "border-accent text-accent" : "border-danger text-danger"
                    }`}
                  >
                    {item.status === "maintenance" ? "Maintenance" : `${available}/${item.quantity} dispo`}
                  </span>
                </div>
                <div className="text-xs text-muted">{item.category}{item.code && ` · ${item.code}`}{item.location && ` · ${item.location}`}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold text-muted">Historique récent</h2>
          <ul className="space-y-2">
            {past.map(({ loan, itemName }) => <LoanCard key={loan.id} loan={{ ...loan, itemName }} />)}
          </ul>
        </section>
      )}
    </div>
  );
}
