"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions";
import { MarkdownField } from "@/components/MarkdownField";
import { addItem, updateItem, requestLoan } from "@/lib/equipment-actions";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

type ItemDefaults = {
  id?: number; name?: string; category?: string; code?: string; location?: string;
  description?: string; quantity?: number; status?: string;
};

function ItemFields({ d }: { d: ItemDefaults }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Nom</label>
          <input name="name" defaultValue={d.name} required maxLength={150} placeholder="Projecteur PAR LED 18x10W" className="input" />
        </div>
        <div>
          <label className="label">Catégorie</label>
          <input name="category" defaultValue={d.category ?? "Lumière"} maxLength={80} list="equipment-categories" className="input" />
          <datalist id="equipment-categories">
            {["Lumière", "Son", "Vidéo", "Câblage", "Structure", "Outillage", "Divers"].map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div>
          <label className="label">Repère d&apos;inventaire</label>
          <input name="code" defaultValue={d.code} maxLength={40} placeholder="LUM-014" className="input" />
        </div>
        <div>
          <label className="label">Emplacement</label>
          <input name="location" defaultValue={d.location} maxLength={120} placeholder="Réserve, étagère B" className="input" />
        </div>
        <div>
          <label className="label">Quantité en stock</label>
          <input name="quantity" type="number" min={1} max={999} defaultValue={d.quantity ?? 1} className="input" />
        </div>
        <div>
          <label className="label">Statut</label>
          <select name="status" defaultValue={d.status ?? "active"} className="input">
            <option value="active">Empruntable</option>
            <option value="maintenance">En maintenance</option>
            <option value="retired">Retiré du catalogue</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <MarkdownField name="description" defaultValue={d.description} rows={4} maxLength={2000} label="Description" />
      </div>
    </>
  );
}

export function AddItemForm() {
  const [state, action, pending] = useActionState(addItem, undefined);
  return (
    <form action={action} className="space-y-3">
      <ItemFields d={{}} />
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Ajout…" : "Ajouter au catalogue"}</button>
    </form>
  );
}

export function EditItemForm({ item }: { item: ItemDefaults & { id: number } }) {
  const [state, action, pending] = useActionState(updateItem, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="itemId" value={item.id} />
      <ItemFields d={item} />
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
    </form>
  );
}

export function RequestLoanForm({ itemId, today, max }: { itemId: number; today: string; max: number }) {
  const [state, action, pending] = useActionState(requestLoan, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="itemId" value={itemId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Du</label>
          <input name="startDate" type="date" min={today} defaultValue={today} required className="input" />
        </div>
        <div>
          <label className="label">Retour au plus tard le</label>
          <input name="dueDate" type="date" min={today} required className="input" />
        </div>
        <div>
          <label className="label">Quantité</label>
          <input name="quantity" type="number" min={1} max={max} defaultValue={1} className="input" />
        </div>
      </div>
      <div>
        <label className="label">Pour quoi ? (projet, évènement)</label>
        <input name="note" maxLength={500} placeholder="Gala de fin d'année" className="input" />
      </div>
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Envoi…" : "Demander ce matériel"}</button>
    </form>
  );
}
