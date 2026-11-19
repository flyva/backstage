// Fiche association et organigramme BDE : libellés partagés serveur / client (pas de dépendance serveur).
import type { BdeStatus } from "@/db/schema";

export const BDE_STATUS_LABEL: Record<BdeStatus, string> = {
  bureau: "Membre du bureau",
  ca: "Membre du CA",
  liste: "Liste BDE",
};

/** Qualifications de base proposées à l'autocomplétion, même si aucune n'est encore en base. */
export const DEFAULT_OFFICER_TITLES = [
  "Président", "Président adjoint",
  "Secrétaire", "Secrétaire adjoint",
  "Trésorier", "Trésorier adjoint",
];

/** Ordre d'affichage du bureau dans l'organigramme : binômes titulaire/adjoint, dans l'ordre protocolaire usuel. */
export const OFFICER_TITLE_ORDER = [
  "Président", "Président adjoint",
  "Secrétaire", "Secrétaire adjoint",
  "Trésorier", "Trésorier adjoint",
];

export function sortByOfficerTitle<T extends { bdeTitle: string | null }>(members: T[]): T[] {
  return [...members].sort((a, b) => {
    const ia = a.bdeTitle ? OFFICER_TITLE_ORDER.indexOf(a.bdeTitle) : -1;
    const ib = b.bdeTitle ? OFFICER_TITLE_ORDER.indexOf(b.bdeTitle) : -1;
    if (ia === -1 && ib === -1) return (a.bdeTitle ?? "").localeCompare(b.bdeTitle ?? "");
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}
