// Droits d'un rôle (partagé serveur / client, sans dépendance serveur).

export type RoleFlags = {
  isAdmin: boolean;
  permAdministration: boolean;
  permMateriel: boolean;
  permBde: boolean;
  permActus: boolean;
  permGalerie: boolean;
};

export type Perms = {
  admin: boolean; // administrateur : tous les droits
  administration: boolean;
  materiel: boolean;
  bde: boolean;
  actus: boolean;
  galerie: boolean;
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
  };
}

/** Droits configurables d'un rôle (hors « administrateur »), avec leur explication. */
export const PERM_FIELDS = [
  { field: "permAdministration", label: "Administration", hint: "Pages d'administration : utilisateurs, rôles, FAQ, liens, modèles de checklists, réglages de l'école." },
  { field: "permMateriel", label: "Matériel", hint: "Gérer l'inventaire, valider les demandes de prêt, suivre les retards." },
  { field: "permBde", label: "BDE", hint: "Créer des évènements et des sondages BDE, publier des actus du BDE." },
  { field: "permActus", label: "Actualités de l'école", hint: "Publier des articles dans la rubrique École." },
  { field: "permGalerie", label: "Galerie", hint: "Créer et gérer les albums photos et vidéos." },
] as const;
