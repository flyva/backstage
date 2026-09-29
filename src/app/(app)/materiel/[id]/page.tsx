import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import QRCode from "qrcode";
import { ArrowLeft } from "lucide-react";
import { headers } from "next/headers";
import { db } from "@/db";
import { loans, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { availableQuantity, isManager, todayParis } from "@/lib/equipment";
import { deleteItem } from "@/lib/equipment-actions";
import { EditItemForm, RequestLoanForm } from "@/components/equipment-forms";
import { ConfirmButton } from "@/components/ConfirmButton";
import { LoanCard } from "@/components/LoanCard";

export default async function ItemPage({ params }: PageProps<"/materiel/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) notFound();

  const today = todayParis();
  const [{ item, available }] = [await availableQuantity(itemId, today, today)];
  if (!item) notFound();
  const manager = isManager(user);

  // QR code vers cette fiche : à imprimer et coller sur le matériel.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const qr = await QRCode.toString(`${proto}://${host}/materiel/${item.id}`, { type: "svg", margin: 1, width: 160 });

  const history = manager
    ? await db
        .select({ loan: loans, borrower: users.name })
        .from(loans)
        .innerJoin(users, eq(users.id, loans.userId))
        .where(eq(loans.itemId, item.id))
        .orderBy(desc(loans.requestedAt))
        .limit(20)
    : [];

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/materiel" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft size={14} /> Catalogue
      </Link>

      <header className="flex flex-wrap items-start gap-5">
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-2xl font-bold">{item.name}</h1>
          <p className="text-sm text-muted">{item.category}{item.code && ` · ${item.code}`}{item.location && ` · ${item.location}`}</p>
          {item.description && <p className="whitespace-pre-line pt-1 text-sm">{item.description}</p>}
          <p className="pt-2 text-sm">
            {item.status === "active" ? (
              <>Disponible aujourd&apos;hui : <strong className={available > 0 ? "text-accent" : "text-danger"}>{available}</strong> / {item.quantity}</>
            ) : (
              <span className="text-muted">{item.status === "maintenance" ? "En maintenance" : "Retiré du catalogue"}</span>
            )}
          </p>
        </div>
        <div
          className="w-32 shrink-0 overflow-hidden rounded-lg bg-white p-1 [&>svg]:h-auto [&>svg]:w-full"
          role="img"
          aria-label="QR code de la fiche"
          dangerouslySetInnerHTML={{ __html: qr }}
        />
      </header>

      {item.status === "active" && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Demander ce matériel</h2>
          <RequestLoanForm itemId={item.id} today={today} max={item.quantity} />
        </section>
      )}

      {manager && (
        <>
          <section className="space-y-2">
            <h2 className="font-semibold">Historique des prêts</h2>
            {history.length === 0 && <p className="text-sm text-muted">Aucun prêt pour cet objet.</p>}
            <ul className="space-y-2">
              {history.map(({ loan, borrower }) => (
                <LoanCard key={loan.id} manager loan={{ ...loan, itemName: item.name, borrower }} />
              ))}
            </ul>
          </section>

          <section className="card space-y-3">
            <h2 className="font-semibold">Modifier la fiche</h2>
            <EditItemForm
              item={{
                id: item.id,
                name: item.name,
                category: item.category,
                code: item.code ?? "",
                location: item.location ?? "",
                description: item.description ?? "",
                quantity: item.quantity,
                status: item.status,
              }}
            />
          </section>

          <section className="card space-y-2 border-danger/50">
            <h2 className="font-semibold text-danger">Supprimer</h2>
            <p className="text-sm text-muted">Un objet déjà prêté est retiré du catalogue (l&apos;historique est conservé), sinon il est supprimé.</p>
            <form action={deleteItem}>
              <input type="hidden" name="itemId" value={item.id} />
              <ConfirmButton message="Retirer ce matériel du catalogue ?" className="btn-ghost border-danger text-danger">Retirer / supprimer</ConfirmButton>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
