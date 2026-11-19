import { Trash2 } from "lucide-react";
import { requireInventoryManager } from "@/lib/inventory";
import { getProducts, getStockLotsWithDetails } from "@/lib/inventory-data";
import { deleteProduct } from "@/lib/inventory-actions";
import { ProductForm } from "@/components/inventory-forms";
import { ConfirmButton } from "@/components/ConfirmButton";

export const metadata = { title: "Produits" };

// Catalogue des produits : créés une fois (code-barre et/ou libellé), réutilisés ensuite à chaque ajout de stock.
export default async function InventoryProductsPage() {
  await requireInventoryManager();
  const [products, lots] = await Promise.all([getProducts(), getStockLotsWithDetails()]);
  const totalByProduct = new Map<number, number>();
  for (const l of lots) totalByProduct.set(l.productId, (totalByProduct.get(l.productId) ?? 0) + l.quantity);

  return (
    <div className="space-y-6">
      <section className="card space-y-3">
        <h2 className="font-semibold">Ajouter un produit</h2>
        <p className="text-sm text-muted">Pas besoin : un nouveau produit se crée tout seul au premier ajout de stock. Utile surtout pour corriger ou préparer une fiche à l&apos;avance.</p>
        <ProductForm />
      </section>

      <section className="card p-0">
        <h2 className="border-b border-line px-4 py-3 font-semibold">Produits ({products.length})</h2>
        {products.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">Aucun produit pour le moment.</p>
        ) : (
          products.map((p) => (
            <details key={p.id} className="border-t border-line">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 marker:hidden">
                <span className="min-w-0 flex-1 truncate font-medium">{p.label}</span>
                {p.barcode && <span className="hidden text-xs text-muted sm:block">{p.barcode}</span>}
                <span className="text-xs text-muted">Stock : {totalByProduct.get(p.id) ?? 0}</span>
                {p.hasExpiry && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">DLC</span>}
              </summary>
              <div className="space-y-4 p-4 pt-0">
                <ProductForm id={p.id} barcode={p.barcode ?? ""} label={p.label} hasExpiry={p.hasExpiry} lowStockThreshold={p.lowStockThreshold} />
                <form action={deleteProduct} className="border-t border-line pt-3">
                  <input type="hidden" name="id" value={p.id} />
                  <ConfirmButton message={`Supprimer le produit « ${p.label} » ?`} className="flex items-center gap-1 text-xs text-muted hover:text-danger"><Trash2 size={14} /> Supprimer</ConfirmButton>
                </form>
              </div>
            </details>
          ))
        )}
      </section>
    </div>
  );
}
