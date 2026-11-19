import { Trash2 } from "lucide-react";
import { requireInventoryManager } from "@/lib/inventory";
import { getLocations, getWarehouses } from "@/lib/inventory-data";
import { deleteLocation, deleteWarehouse } from "@/lib/inventory-actions";
import { LocationForm, WarehouseForm } from "@/components/inventory-forms";
import { ConfirmButton } from "@/components/ConfirmButton";

export const metadata = { title: "Paramètres inventaire" };

// Paramétrage d'adressage : plusieurs entrepôts (stocks) possibles, chacun avec ses adresses de rangement.
export default async function InventorySettingsPage() {
  await requireInventoryManager();
  const [warehouses, locations] = await Promise.all([getWarehouses(), getLocations()]);

  return (
    <div className="space-y-6">
      <section className="card space-y-3">
        <h2 className="font-semibold">Entrepôts (plusieurs stocks possibles)</h2>
        <WarehouseForm />
        {warehouses.length > 0 && (
          <ul className="divide-y divide-line text-sm">
            {warehouses.map((w) => (
              <li key={w.id} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1 truncate font-medium">{w.name}</span>
                <form action={deleteWarehouse}>
                  <input type="hidden" name="id" value={w.id} />
                  <ConfirmButton message={`Supprimer l'entrepôt « ${w.name} » ?`} className="flex items-center gap-1 text-xs text-muted hover:text-danger"><Trash2 size={14} /></ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Adresses de rangement</h2>
        {warehouses.length === 0 ? (
          <p className="text-sm text-muted">Crée d&apos;abord un entrepôt ci-dessus.</p>
        ) : (
          <>
            <LocationForm warehouses={warehouses} />
            {locations.length > 0 && (
              <ul className="divide-y divide-line text-sm">
                {locations.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 py-2">
                    <span className="min-w-0 flex-1 truncate font-medium">{l.code}</span>
                    <span className="text-xs text-muted">{warehouses.find((w) => w.id === l.warehouseId)?.name}</span>
                    <form action={deleteLocation}>
                      <input type="hidden" name="id" value={l.id} />
                      <ConfirmButton message={`Supprimer l'adresse « ${l.code} » ?`} className="flex items-center gap-1 text-xs text-muted hover:text-danger"><Trash2 size={14} /></ConfirmButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}
