import "server-only";
import { stat } from "node:fs/promises";
import path from "node:path";

// Icône du site (onglet, écran d'accueil, application installée) : celle de l'administrateur si elle existe, sinon celle d'origine.
export const siteIconDir = () => path.join(process.cwd(), "data", "uploads", "site");
export const siteIconPath = () => path.join(/*turbopackIgnore: true*/ siteIconDir(), "icon.png");
// Version « maskable » : le logo est réduit avec une marge (zone de sécurité) sur un fond plein, pour ne pas être
// rogné par le masque (cercle, carré arrondi…) qu'Android applique à l'icône une fois l'app installée.
export const siteIconMaskablePath = () => path.join(/*turbopackIgnore: true*/ siteIconDir(), "icon-maskable.png");

/** Date de modification de l'icône personnalisée (sert à rafraîchir le cache des navigateurs), ou null s'il n'y en a pas. */
export async function siteIconVersion(): Promise<number | null> {
  try {
    return Math.round((await stat(siteIconPath())).mtimeMs);
  } catch {
    return null;
  }
}
