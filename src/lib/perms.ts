// Droits d'un rôle (partagé serveur / client, sans dépendance serveur).

export type RoleFlags = {
  isAdmin: boolean;
  permAdministration: boolean;
  permMateriel: boolean;
  permBde: boolean;
  permActus: boolean;
  permGalerie: boolean;
  permTickets: boolean;
  viewMateriel: boolean;
  viewBde: boolean;
  viewActus: boolean;
  viewGalerie: boolean;
  viewSavoirs: boolean;
  viewPromo: boolean;
  viewVie: boolean;
  viewDetente: boolean;
  courseTags: string | null;
  // Pages individuelles masquées pour ce rôle (hors pages à niveau Voir/Gérer et pages de Cours, déjà couvertes
  // ailleurs) : liste de hrefs séparés par des virgules. Vide ou absent = rien de masqué (comportement par défaut).
  hiddenPages: string | null;
};

export type Module = "materiel" | "bde" | "actus" | "galerie";
export type Section = "savoirs" | "promo" | "vie" | "detente";

/** Pages du sous-menu « Cours » (dans Travail). D'autres s'ajouteront avec le temps : chacune a une clé stable, à cocher
 * ou non par rôle, sans toucher à la base (elles sont stockées comme une liste de clés dans `courseTags`). */
export const COURSE_PAGES = [
  { key: "cours", label: "Mes cours" },
  { key: "habilitation", label: "Habilitation électrique" },
  { key: "reseaux", label: "Réseaux" },
  { key: "mecanique", label: "Mécanique" },
  { key: "electricite", label: "Électricité" },
  { key: "lumiere", label: "Lumière" },
] as const;
export type CoursePageKey = (typeof COURSE_PAGES)[number]["key"];

export type Perms = {
  admin: boolean; // administrateur : tous les droits
  administration: boolean;
  materiel: boolean;
  bde: boolean;
  actus: boolean;
  galerie: boolean;
  /** Voit et gère tous les tickets (sans besoin d'être administrateur). */
  tickets: boolean;
  /** Peut ouvrir le domaine (lecture) : « Voir » ou « Gérer ». */
  view: Record<Module, boolean>;
  /** Voit cette partie du menu (Savoirs, Promo, Vie étudiante). Rien dans ces parties n'est géré finement par ailleurs. */
  sections: Record<Section, boolean>;
  /** Pages du sous-menu Cours que ce rôle voit. */
  courses: Record<CoursePageKey, boolean>;
  /** Pages individuelles du menu masquées pour ce rôle (vide pour un administrateur). */
  hiddenPages: string[];
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
    tickets: a || !!r?.permTickets,
    view: {
      materiel: a || !!r?.permMateriel || (r ? !!r.viewMateriel : true),
      bde: a || !!r?.permBde || (r ? !!r.viewBde : true),
      actus: a || !!r?.permActus || (r ? !!r.viewActus : true),
      galerie: a || !!r?.permGalerie || (r ? !!r.viewGalerie : true),
    },
    sections: {
      savoirs: a || (r ? !!r.viewSavoirs : true),
      promo: a || (r ? !!r.viewPromo : true),
      vie: a || (r ? !!r.viewVie : true),
      detente: a || (r ? !!r.viewDetente : true),
    },
    courses: courseAccess(a, r?.courseTags ?? null),
    hiddenPages: a ? [] : (r?.hiddenPages ? r.hiddenPages.split(",").map((h) => h.trim()).filter(Boolean) : []),
  };
}

/** `courseTags` vide ou absent = toutes les pages de Cours sont visibles (comportement par défaut, sans configuration). */
function courseAccess(admin: boolean, tags: string | null): Record<CoursePageKey, boolean> {
  const allowed = tags ? new Set(tags.split(",").map((t) => t.trim()).filter(Boolean)) : null;
  return Object.fromEntries(COURSE_PAGES.map((p) => [p.key, admin || !allowed || allowed.has(p.key)])) as Record<CoursePageKey, boolean>;
}

/** Sections entières du menu, à cocher ou non par rôle (pas de niveau « Gérer », juste visible ou pas). */
export const SECTION_FIELDS = [
  { key: "savoirs", field: "viewSavoirs", label: "Savoirs", hint: "Wiki, bibliothèque, assistant, FAQ." },
  { key: "promo", field: "viewPromo", label: "Promo", hint: "Actualités, annuaire, annonces, disponibilités, covoiturage." },
  { key: "vie", field: "viewVie", label: "Vie étudiante", hint: "BDE, galerie, Instagram." },
  { key: "detente", field: "viewDetente", label: "Détente", hint: "Espace jeu (Tetris), scores et joueurs en direct." },
] as const;

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

/** Droit « Tickets » (une seule case) : gérer les tickets de tout le monde sans avoir besoin d'être administrateur. */
export const TICKETS_PERM = { field: "permTickets", label: "Gestion des tickets", hint: "Voir tous les tickets, changer leur statut et y répondre (page séparée de l'administration)." } as const;

/** Gère les tickets de tout le monde : les rôles avec le droit « Gestion des tickets » (les admins ont tout). */
export const canManageTickets = (u: { perms: { tickets: boolean } }) => u.perms.tickets;
