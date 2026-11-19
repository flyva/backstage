import { requireInventoryViewer } from "@/lib/inventory";
import { getLocations, getProducts, getStockLotsWithDetails, getWarehouses } from "@/lib/inventory-data";
import { AddStockForm, DeleteLotButton, TransferForm } from "@/components/inventory-forms";
import { AlertTriangle, CalendarClock } from "lucide-react";

export const metadata = { title: "Stock" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" });

function dlcState(expiresOn: string | null, today: string): "ok" | "soon" | "expired" | null {
  if (!expiresOn) return null;
  const days = Math.round((new Date(expiresOn).getTime() - new Date(today).getTime()) / 86400000);
  if (days < 0) return "expired";
  if (days <= 7) return "soon";
  return "ok";
}

export default async function InventairePage() {
  const user = await requireInventoryViewer();
  const canManage = user.perms.inventaire;
  const today = new Date().toISOString().slice(0, 10);

  const [lots, products, locations, warehouses] = await Promise.all([
    getStockLotsWithDetails(), getProducts(), getLocations(), getWarehouses(),
  ]);
  const totalByProduct = new Map<number, number>();
  for (const l of lots) totalByProduct.set(l.productId, (totalByProduct.get(l.productId) ?? 0) + l.quantity);

  const sorted = [...lots].sort((a, b) => (a.product?.label ?? "").localeCompare(b.product?.label ?? ""));

  return (
    <div className="space-y-6">
      {canManage && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Ajouter du stock</h2>
          <AddStockForm products={products} locations={locations} warehouses={warehouses} />
        </section>
      )}

      <section className="card p-0">
        <h2 className="border-b border-line px-4 py-3 font-semibold">Stock actuel ({lots.length})</h2>
        {sorted.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">Aucun stock pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-line bg-bg text-left text-xs text-muted"><th className="px-4 py-1.5 font-medium">Produit</th><th className="py-1.5 pr-3 font-medium">Adresse</th><th className="py-1.5 pr-3 text-right font-medium">Quantité</th><th className="py-1.5 pr-3 font-medium">DLC</th><th className="py-1.5 pr-4 font-medium" /></tr></thead>
              <tbody className="divide-y divide-line">
                {sorted.map((lot) => {
                  const dlc = dlcState(lot.expiresOn, today);
                  const low = lot.product?.lowStockThreshold != null && totalByProduct.get(lot.productId)! <= lot.product.lowStockThreshold;
                  return (
                    <tr key={lot.id}>
                      <td className="px-4 py-1.5">
                        {lot.product?.label ?? "—"}
                        {lot.product?.barcode && <span className="block text-xs text-muted">{lot.product.barcode}</span>}
                        {low && <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"><AlertTriangle size={11} /> Stock bas</span>}
                      </td>
                      <td className="py-1.5 pr-3 text-muted">{lot.location?.code} — {lot.warehouse?.name}</td>
                      <td className="py-1.5 pr-3 text-right font-medium tabular-nums">{lot.quantity}</td>
                      <td className="py-1.5 pr-3">
                        {lot.expiresOn ? (
                          <span className={`inline-flex items-center gap-1 text-xs ${dlc === "expired" ? "text-danger" : dlc === "soon" ? "text-amber-600 dark:text-amber-400" : "text-muted"}`}>
                            <CalendarClock size={11} /> {dateFmt.format(new Date(`${lot.expiresOn}T12:00:00`))}
                          </span>
                        ) : <span className="text-xs text-muted">—</span>}
                      </td>
                      <td className="py-1.5 pr-4">
                        {canManage && (
                          <div className="flex items-center gap-2">
                            <TransferForm lotId={lot.id} maxQuantity={lot.quantity} locations={locations} excludeLocationId={lot.locationId} warehouses={warehouses} />
                            <DeleteLotButton id={lot.id} />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
