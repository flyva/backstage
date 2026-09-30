// Droits d'un rôle (partagé serveur / client, sans dépendance serveur).

export type RoleFlags = {
  isAdmin: boolean;
  permAdministration: boolean;
  permMateriel: boolean;
  permBde: boolean;
  permActus: boolean;
  permGalerie: boolean;
  viewMateriel: boolean;
  viewBde: boolean;
  viewActus: boolean;
  viewGalerie: boolean;
};

export type Module = "materiel" | "bde" | "actus" | "galerie";

export type Perms = {
  admin: boolean; // administrateur : tous les droits
  administration: boolean;
  materiel: boolean;
  bde: boolean;
  actus: boolean;
  galerie: boolean;
  /** Peut ouvrir le domaine (lecture) : « Voir » ou « Gérer ». */
  view: Record<Module, boolean>;
};

/** Un administrateur a tous les droits, quel que soit le détail coché. */
export function permsOf(r: RoleFlags | null | undefined): Perms {
  const a = !!r?.isAdmin;
  return {
    admin: a,
    administration: a || !!r?.permAdministration,
    materiel: a || !!r?.permMateriel,
    bde: a || !!r?.permBde,
    actus: a || !!r?.permActus,
    galerie: a || !!r?.permGalerie,
    view: {
      materiel: a || !!r?.permMateriel || (r ? !!r.viewMateriel : true),
      bde: a || !!r?.permBde || (r ? !!r.viewBde : true),
      actus: a || !!r?.permActus || (r ? !!r.viewActus : true),
      galerie: a || !!r?.permGalerie || (r ? !!r.viewGalerie : true),
    },
  };
}

/** Domaines à trois niveaux (Aucun / Voir / Gérer). */
export const LEVEL_FIELDS = [
  { module: "materiel", manage: "permMateriel", view: "viewMateriel", label: "Matériel", hint: "Voir : consulter l'inventaire et demander un prêt. Gérer : modifier l'inventaire, valider les prêts, suivre les retards." },
  { module: "bde", manage: "permBde", view: "viewBde", label: "BDE", hint: "Voir : consulter les évènements et sondages, s'inscrire, proposer une idée. Gérer : créer des évènements et des sondages, publier pour le BDE." },
  { module: "actus", manage: "permActus", view: "viewActus", label: "Actualités de l'école", hint: "Voir : lire les articles. Gérer : publier et modifier des articles de la rubrique École." },
  { module: "galerie", manage: "permGalerie", view: "viewGalerie", label: "Galerie", hint: "Voir : parcourir les albums et ajouter ses photos. Gérer : créer et modifier tous les albums." },
] as const;

export type Level = "none" | "view" | "manage";
export const LEVEL_LABEL: Record<Level, string> = { none: "Aucun", view: "Voir", manage: "Gérer" };
export const levelOf = (r: Record<string, unknown>, f: (typeof LEVEL_FIELDS)[number]): Level => (r[f.manage] ? "manage" : r[f.view] ? "view" : "none");

/** Droit « Administration » (une seule case : pas de lecture seule). */
export const ADMIN_PERM = { field: "permAdministration", label: "Administration", hint: "Accès aux pages d'administration : utilisateurs, rôles, FAQ, liens, modèles de checklists, réglages de l'école." } as const;
