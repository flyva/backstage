import "server-only";
import { stat } from "node:fs/promises";
import path from "node:path";

// Icône du site (onglet, écran d'accueil, application installée) : celle de l'administrateur si elle existe, sinon celle d'origine.
export const siteIconDir = () => path.join(process.cwd(), "data", "uploads", "site");
export const siteIconPath = () => path.join(/*turbopackIgnore: true*/ siteIconDir(), "icon.png");

/** Date de modification de l'icône personnalisée (sert à rafraîchir le cache des navigateurs), ou null s'il n'y en a pas. */
export async function siteIconVersion(): Promise<number | null> {
  try {
    return Math.round((await stat(siteIconPath())).mtimeMs);
  } catch {
    return null;
  }
}
