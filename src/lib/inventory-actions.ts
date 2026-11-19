"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { inventoryLocations, inventoryProducts, inventoryStockLots, inventoryWarehouses } from "@/db/schema";
import { requireInventoryManager } from "@/lib/inventory";
import { logAdminAction } from "@/lib/audit";
import { isDay } from "@/lib/alternance";
import type { FormState } from "@/lib/actions";

const refresh = () => {
  revalidatePath("/inventaire");
  revalidatePath("/inventaire/produits");
  revalidatePath("/inventaire/parametres");
};

// ---------- Entrepôts ----------

export async function saveWarehouse(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireInventoryManager();
  const name = String(fd.get("name") ?? "").trim();
  if (!name || name.length > 100) return { error: "Nom d'entrepôt invalide." };
  const raw = Number(fd.get("id") || 0);
  if (raw) await db.update(inventoryWarehouses).set({ name }).where(eq(inventoryWarehouses.id, raw));
  else await db.insert(inventoryWarehouses).values({ name });
  await logAdminAction(admin.id, "inventory-warehouse-save", null, name);
  refresh();
  return { ok: "Entrepôt enregistré." };
}

export async function deleteWarehouse(fd: FormData) {
  const admin = await requireInventoryManager();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  await db.delete(inventoryWarehouses).where(eq(inventoryWarehouses.id, id));
  await logAdminAction(admin.id, "inventory-warehouse-delete", null, String(id));
  refresh();
}

// ---------- Adresses ----------

const locationSchema = z.object({
  warehouseId: z.coerce.number().int().positive(),
  code: z.string().trim().min(1, "Code requis").max(40),
});

export async function saveLocation(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireInventoryManager();
  const p = locationSchema.safeParse({ warehouseId: fd.get("warehouseId"), code: fd.get("code") });
  if (!p.success) return { error: p.error.issues[0].message };
  const raw = Number(fd.get("id") || 0);
  const [dup] = await db.select({ id: inventoryLocations.id }).from(inventoryLocations)
    .where(and(eq(inventoryLocations.warehouseId, p.data.warehouseId), eq(inventoryLocations.code, p.data.code))).limit(1);
  if (dup && dup.id !== raw) return { error: "Cette adresse existe déjà dans cet entrepôt." };
  if (raw) await db.update(inventoryLocations).set(p.data).where(eq(inventoryLocations.id, raw));
  else await db.insert(inventoryLocations).values(p.data);
  await logAdminAction(admin.id, "inventory-location-save", null, p.data.code);
  refresh();
  return { ok: "Adresse enregistrée." };
}

export async function deleteLocation(fd: FormData) {
  const admin = await requireInventoryManager();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  const [used] = await db.select({ id: inventoryStockLots.id }).from(inventoryStockLots).where(eq(inventoryStockLots.locationId, id)).limit(1);
  if (used) return; // il reste du stock à cette adresse : on ne supprime pas en silence
  await db.delete(inventoryLocations).where(eq(inventoryLocations.id, id));
  await logAdminAction(admin.id, "inventory-location-delete", null, String(id));
  refresh();
}

// ---------- Produits ----------

const productSchema = z.object({
  barcode: z.string().trim().max(64),
  label: z.string().trim().min(1, "Libellé requis").max(200),
  hasExpiry: z.coerce.boolean(),
  lowStockThreshold: z.string().trim(),
});

export async function saveProduct(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireInventoryManager();
  const p = productSchema.safeParse({
    barcode: fd.get("barcode") ?? "", label: fd.get("label"), hasExpiry: fd.get("hasExpiry") === "on",
    lowStockThreshold: fd.get("lowStockThreshold") ?? "",
  });
  if (!p.success) return { error: p.error.issues[0].message };
  const threshold = p.data.lowStockThreshold ? Number(p.data.lowStockThreshold) : null;
  if (threshold !== null && (!Number.isInteger(threshold) || threshold < 0)) return { error: "Seuil de stock bas invalide." };

  const values = { barcode: p.data.barcode || null, label: p.data.label, hasExpiry: p.data.hasExpiry, lowStockThreshold: threshold };
  const raw = Number(fd.get("id") || 0);
  if (values.barcode) {
    const [dup] = await db.select({ id: inventoryProducts.id }).from(inventoryProducts).where(eq(inventoryProducts.barcode, values.barcode)).limit(1);
    if (dup && dup.id !== raw) return { error: "Ce code-barre est déjà utilisé par un autre produit." };
  }
  if (raw) await db.update(inventoryProducts).set(values).where(eq(inventoryProducts.id, raw));
  else await db.insert(inventoryProducts).values(values);
  await logAdminAction(admin.id, "inventory-product-save", null, p.data.label);
  refresh();
  return { ok: "Produit enregistré." };
}

export async function deleteProduct(fd: FormData) {
  const admin = await requireInventoryManager();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  const [used] = await db.select({ id: inventoryStockLots.id }).from(inventoryStockLots).where(eq(inventoryStockLots.productId, id)).limit(1);
  if (used) return; // il reste du stock de ce produit : on ne supprime pas en silence
  await db.delete(inventoryProducts).where(eq(inventoryProducts.id, id));
  await logAdminAction(admin.id, "inventory-product-delete", null, String(id));
  refresh();
}

// ---------- Ajout de stock ----------

const addStockSchema = z.object({
  barcode: z.string().trim().max(64),
  label: z.string().trim().max(200),
  newHasExpiry: z.coerce.boolean(),
  newLowStockThreshold: z.string().trim(),
  locationId: z.coerce.number().int().positive("Choisis une adresse."),
  quantity: z.coerce.number().int().positive("Quantité : doit être supérieure à 0."),
  expiresOn: z.string().trim(),
});

/** Ajoute du stock : retrouve le produit par code-barre (sinon par libellé exact), ou le crée. La première fois
 *  qu'un produit est rangé quelque part, cette adresse devient son adresse « de base » pour la prochaine fois. */
export async function addStock(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireInventoryManager();
  const p = addStockSchema.safeParse({
    barcode: fd.get("barcode") ?? "", label: fd.get("label") ?? "", newHasExpiry: fd.get("newHasExpiry") === "on",
    newLowStockThreshold: fd.get("newLowStockThreshold") ?? "", locationId: fd.get("locationId"),
    quantity: fd.get("quantity"), expiresOn: fd.get("expiresOn") ?? "",
  });
  if (!p.success) return { error: p.error.issues[0].message };
  if (!p.data.barcode && !p.data.label) return { error: "Indique au moins un code-barre ou un libellé." };
  if (p.data.expiresOn && !isDay(p.data.expiresOn)) return { error: "Date de péremption invalide." };

  let product = p.data.barcode ? await db.select().from(inventoryProducts).where(eq(inventoryProducts.barcode, p.data.barcode)).then((r) => r[0]) : undefined;
  if (!product && p.data.label) product = await db.select().from(inventoryProducts).where(eq(inventoryProducts.label, p.data.label)).then((r) => r[0]);

  if (!product) {
    if (!p.data.label) return { error: "Nouveau produit : indique un libellé." };
    const threshold = p.data.newLowStockThreshold ? Number(p.data.newLowStockThreshold) : null;
    const values = { barcode: p.data.barcode || null, label: p.data.label, hasExpiry: p.data.newHasExpiry, lowStockThreshold: threshold };
    const [res] = await db.insert(inventoryProducts).values(values);
    product = { id: res.insertId, ...values, defaultLocationId: null, createdAt: new Date() };
  }

  const expiresOn = product.hasExpiry && p.data.expiresOn ? p.data.expiresOn : null;
  const candidates = await db.select().from(inventoryStockLots)
    .where(and(eq(inventoryStockLots.productId, product.id), eq(inventoryStockLots.locationId, p.data.locationId)));
  const existingLot = candidates.find((r) => r.expiresOn === expiresOn);
  if (existingLot) {
    await db.update(inventoryStockLots).set({ quantity: existingLot.quantity + p.data.quantity }).where(eq(inventoryStockLots.id, existingLot.id));
  } else {
    await db.insert(inventoryStockLots).values({ productId: product.id, locationId: p.data.locationId, quantity: p.data.quantity, expiresOn });
  }

  if (!product.defaultLocationId) await db.update(inventoryProducts).set({ defaultLocationId: p.data.locationId }).where(eq(inventoryProducts.id, product.id));

  await logAdminAction(admin.id, "inventory-stock-add", null, `${product.label} (+${p.data.quantity})`);
  refresh();
  return { ok: `${p.data.quantity} unité(s) de « ${product.label} » ajoutée(s).` };
}

// ---------- Transfert de stock ----------

const transferSchema = z.object({
  lotId: z.coerce.number().int().positive(),
  toLocationId: z.coerce.number().int().positive("Choisis une adresse de destination."),
  quantity: z.coerce.number().int().positive("Quantité : doit être supérieure à 0."),
});

/** Transfère de la quantité d'un lot vers une autre adresse, pour le MÊME produit uniquement, jamais en négatif. */
export async function transferStock(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireInventoryManager();
  const p = transferSchema.safeParse({ lotId: fd.get("lotId"), toLocationId: fd.get("toLocationId"), quantity: fd.get("quantity") });
  if (!p.success) return { error: p.error.issues[0].message };

  const [lot] = await db.select().from(inventoryStockLots).where(eq(inventoryStockLots.id, p.data.lotId)).limit(1);
  if (!lot) return { error: "Lot introuvable." };
  if (lot.locationId === p.data.toLocationId) return { error: "La destination doit être différente de l'adresse actuelle." };
  if (p.data.quantity > lot.quantity) return { error: `Seulement ${lot.quantity} unité(s) disponible(s) à cette adresse.` };

  const [product] = await db.select().from(inventoryProducts).where(eq(inventoryProducts.id, lot.productId)).limit(1);

  const destCandidates = await db.select().from(inventoryStockLots)
    .where(and(eq(inventoryStockLots.productId, lot.productId), eq(inventoryStockLots.locationId, p.data.toLocationId)));
  const destLot = destCandidates.find((r) => r.expiresOn === lot.expiresOn);

  const remaining = lot.quantity - p.data.quantity;
  if (remaining > 0) await db.update(inventoryStockLots).set({ quantity: remaining }).where(eq(inventoryStockLots.id, lot.id));
  else await db.delete(inventoryStockLots).where(eq(inventoryStockLots.id, lot.id));

  if (destLot) await db.update(inventoryStockLots).set({ quantity: destLot.quantity + p.data.quantity }).where(eq(inventoryStockLots.id, destLot.id));
  else await db.insert(inventoryStockLots).values({ productId: lot.productId, locationId: p.data.toLocationId, quantity: p.data.quantity, expiresOn: lot.expiresOn });

  await logAdminAction(admin.id, "inventory-stock-transfer", null, `${product?.label ?? lot.productId} (${p.data.quantity})`);
  refresh();
  return { ok: "Transfert effectué." };
}

export async function deleteStockLot(fd: FormData) {
  const admin = await requireInventoryManager();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  await db.delete(inventoryStockLots).where(eq(inventoryStockLots.id, id));
  await logAdminAction(admin.id, "inventory-stock-delete", null, String(id));
  refresh();
}
