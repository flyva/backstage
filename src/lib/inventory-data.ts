// Lectures partagées pour le module Inventaire (entrepôts, adresses, produits, stock).
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { inventoryLocations, inventoryProducts, inventoryStockLots, inventoryWarehouses } from "@/db/schema";

export async function getWarehouses() {
  return db.select().from(inventoryWarehouses).orderBy(asc(inventoryWarehouses.name));
}

export async function getLocations() {
  return db.select().from(inventoryLocations).orderBy(asc(inventoryLocations.code));
}

export async function getLocationsOf(warehouseId: number) {
  return db.select().from(inventoryLocations).where(eq(inventoryLocations.warehouseId, warehouseId)).orderBy(asc(inventoryLocations.code));
}

export async function getProducts() {
  return db.select().from(inventoryProducts).orderBy(asc(inventoryProducts.label));
}

export async function getProductByBarcode(barcode: string) {
  const [p] = await db.select().from(inventoryProducts).where(eq(inventoryProducts.barcode, barcode)).limit(1);
  return p ?? null;
}

/** Tous les lots de stock, avec le produit, l'adresse et l'entrepôt déjà résolus (pour l'affichage). */
export async function getStockLotsWithDetails() {
  const [lots, products, locations, warehouses] = await Promise.all([
    db.select().from(inventoryStockLots),
    getProducts(),
    getLocations(),
    getWarehouses(),
  ]);
  const productById = new Map(products.map((p) => [p.id, p]));
  const locationById = new Map(locations.map((l) => [l.id, l]));
  const warehouseById = new Map(warehouses.map((w) => [w.id, w]));
  return lots.map((lot) => {
    const product = productById.get(lot.productId) ?? null;
    const location = locationById.get(lot.locationId) ?? null;
    const warehouse = location ? (warehouseById.get(location.warehouseId) ?? null) : null;
    return { ...lot, product, location, warehouse };
  });
}

/** Quantité totale d'un produit, tous lots et toutes adresses confondus (pour le seuil de stock bas). */
export function totalQuantityOf(productId: number, lots: { productId: number; quantity: number }[]) {
  return lots.filter((l) => l.productId === productId).reduce((s, l) => s + l.quantity, 0);
}
