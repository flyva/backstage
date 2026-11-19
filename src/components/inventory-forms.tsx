"use client";

import { useActionState, useMemo, useState } from "react";
import type { FormState } from "@/lib/actions";
import {
  addStock, deleteStockLot, saveLocation, saveProduct, saveWarehouse, transferStock,
} from "@/lib/inventory-actions";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

export type ProductOption = { id: number; barcode: string | null; label: string; hasExpiry: boolean; defaultLocationId: number | null };
export type LocationOption = { id: number; code: string; warehouseId: number };
export type WarehouseOption = { id: number; name: string };

/** Formulaire d'entrepôt (plusieurs stocks possibles). */
export function WarehouseForm({ id, name = "" }: { id?: number; name?: string }) {
  const [state, action, pending] = useActionState(saveWarehouse, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      {id && <input type="hidden" name="id" value={id} />}
      <div className="flex-1">
        <label className="label" htmlFor={`wh-name-${id ?? "new"}`}>Nom de l&apos;entrepôt</label>
        <input id={`wh-name-${id ?? "new"}`} name="name" required maxLength={100} defaultValue={name} placeholder="Local BDE, Réserve bar…" className="input" />
      </div>
      <div><Feedback state={state} /><button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button></div>
    </form>
  );
}

/** Formulaire d'adresse de rangement, rattachée à un entrepôt. */
export function LocationForm({ id, warehouses, warehouseId, code = "" }: { id?: number; warehouses: WarehouseOption[]; warehouseId?: number; code?: string }) {
  const [state, action, pending] = useActionState(saveLocation, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      {id && <input type="hidden" name="id" value={id} />}
      <div>
        <label className="label" htmlFor={`loc-wh-${id ?? "new"}`}>Entrepôt</label>
        <select id={`loc-wh-${id ?? "new"}`} name="warehouseId" required defaultValue={warehouseId ?? ""} className="input">
          <option value="" disabled>Choisir…</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`loc-code-${id ?? "new"}`}>Adresse</label>
        <input id={`loc-code-${id ?? "new"}`} name="code" required maxLength={40} defaultValue={code} placeholder="A1-03" className="input" />
      </div>
      <div className="self-end"><Feedback state={state} /><button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button></div>
    </form>
  );
}

/** Formulaire produit (catalogue) : code-barre, libellé, DLC oui/non, seuil de stock bas. */
export function ProductForm({ id, barcode = "", label = "", hasExpiry = false, lowStockThreshold }: { id?: number; barcode?: string; label?: string; hasExpiry?: boolean; lowStockThreshold?: number | null }) {
  const [state, action, pending] = useActionState(saveProduct, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4">
      {id && <input type="hidden" name="id" value={id} />}
      <div><label className="label" htmlFor={`pr-bc-${id ?? "new"}`}>Code-barre (facultatif)</label><input id={`pr-bc-${id ?? "new"}`} name="barcode" maxLength={64} defaultValue={barcode} className="input" /></div>
      <div className="sm:col-span-2"><label className="label" htmlFor={`pr-label-${id ?? "new"}`}>Libellé</label><input id={`pr-label-${id ?? "new"}`} name="label" required maxLength={200} defaultValue={label} className="input" /></div>
      <div><label className="label" htmlFor={`pr-th-${id ?? "new"}`}>Seuil de stock bas</label><input id={`pr-th-${id ?? "new"}`} name="lowStockThreshold" type="number" min={0} defaultValue={lowStockThreshold ?? ""} placeholder="Aucun" className="input" /></div>
      <label className="flex items-center gap-2 text-sm sm:col-span-4"><input type="checkbox" name="hasExpiry" defaultChecked={hasExpiry} /> Ce produit a une date de péremption (DLC)</label>
      <div className="sm:col-span-4"><Feedback state={state} /><button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button></div>
    </form>
  );
}

/** Ajout de stock : on retrouve le produit par code-barre ou libellé (créé sinon), l'adresse habituelle de ce
 *  code-barre est proposée par défaut (modifiable) dès qu'on le reconnaît. */
export function AddStockForm({ products, locations, warehouses }: { products: ProductOption[]; locations: LocationOption[]; warehouses: WarehouseOption[] }) {
  const [state, action, pending] = useActionState(addStock, undefined);
  const [barcode, setBarcode] = useState("");
  const [label, setLabel] = useState("");
  const [locationId, setLocationId] = useState("");
  const [locationTouched, setLocationTouched] = useState(false);

  const matched = useMemo(() => {
    if (barcode) return products.find((p) => p.barcode === barcode) ?? null;
    if (label) return products.find((p) => p.label.toLowerCase() === label.toLowerCase()) ?? null;
    return null;
  }, [barcode, label, products]);

  const effectiveLocationId = !locationTouched && matched?.defaultLocationId ? String(matched.defaultLocationId) : locationId;
  const hasExpiry = matched ? matched.hasExpiry : undefined;

  const warehouseOf = (whId: number) => warehouses.find((w) => w.id === whId)?.name ?? "";

  return (
    <form action={action} className="space-y-4" key={state?.ok ? "done" : "form"}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="as-barcode">Code-barre</label>
          <input id="as-barcode" name="barcode" list="as-barcodes" value={barcode} onChange={(e) => setBarcode(e.target.value)} className="input" />
          <datalist id="as-barcodes">{products.filter((p) => p.barcode).map((p) => <option key={p.id} value={p.barcode!}>{p.label}</option>)}</datalist>
        </div>
        <div>
          <label className="label" htmlFor="as-label">Libellé</label>
          <input id="as-label" name="label" list="as-labels" value={label} onChange={(e) => setLabel(e.target.value)} required={!barcode} className="input" />
          <datalist id="as-labels">{products.map((p) => <option key={p.id} value={p.label} />)}</datalist>
        </div>
      </div>

      {matched ? (
        <p className="rounded-lg border border-accent/30 bg-accent/5 p-2 text-sm">
          Référence connue : <strong>{matched.label}</strong>{matched.hasExpiry ? " (avec DLC)" : " (sans DLC)"}.
          {matched.defaultLocationId && <> Adresse habituelle proposée ci-dessous — modifiable.</>}
        </p>
      ) : (barcode || label) ? (
        <div className="space-y-3 rounded-lg border border-line p-3">
          <p className="text-sm text-muted">Nouveau produit : précise ses infos (elles seront réutilisées la prochaine fois).</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="newHasExpiry" /> A une date de péremption (DLC)</label>
            <div>
              <label className="label" htmlFor="as-threshold">Seuil de stock bas (facultatif)</label>
              <input id="as-threshold" name="newLowStockThreshold" type="number" min={0} placeholder="Aucun" className="input" />
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="as-location">Adresse</label>
          <select id="as-location" name="locationId" required value={effectiveLocationId} onChange={(e) => { setLocationId(e.target.value); setLocationTouched(true); }} className="input">
            <option value="" disabled>Choisir…</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.code} — {warehouseOf(l.warehouseId)}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="as-quantity">Quantité</label>
          <input id="as-quantity" name="quantity" type="number" min={1} required defaultValue={1} className="input" />
        </div>
        {(hasExpiry ?? true) && (
          <div>
            <label className="label" htmlFor="as-expires">DLC (si applicable)</label>
            <input id="as-expires" name="expiresOn" type="date" className="input" />
          </div>
        )}
      </div>

      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Ajout…" : "Ajouter au stock"}</button>
    </form>
  );
}

/** Transfère de la quantité d'un lot vers une autre adresse (même produit uniquement, jamais en négatif). */
export function TransferForm({ lotId, maxQuantity, locations, excludeLocationId, warehouses }: { lotId: number; maxQuantity: number; locations: LocationOption[]; excludeLocationId: number; warehouses: WarehouseOption[] }) {
  const [state, action, pending] = useActionState(transferStock, undefined);
  const warehouseOf = (id: number) => warehouses.find((w) => w.id === id)?.name ?? "";
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="lotId" value={lotId} />
      <div>
        <label className="label" htmlFor={`tr-to-${lotId}`}>Vers</label>
        <select id={`tr-to-${lotId}`} name="toLocationId" required defaultValue="" className="input w-auto">
          <option value="" disabled>Adresse…</option>
          {locations.filter((l) => l.id !== excludeLocationId).map((l) => <option key={l.id} value={l.id}>{l.code} — {warehouseOf(l.warehouseId)}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`tr-qty-${lotId}`}>Qté</label>
        <input id={`tr-qty-${lotId}`} name="quantity" type="number" min={1} max={maxQuantity} required defaultValue={1} className="input w-20" />
      </div>
      <button className="btn-ghost text-xs" disabled={pending}>{pending ? "…" : "Transférer"}</button>
      <Feedback state={state} />
    </form>
  );
}

export function DeleteLotButton({ id }: { id: number }) {
  return (
    <form action={deleteStockLot} onSubmit={(e) => { if (!confirm("Supprimer ce lot de stock ?")) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <button className="text-xs text-muted hover:text-danger">Supprimer</button>
    </form>
  );
}
