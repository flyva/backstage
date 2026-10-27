// Liens utiles (outils, sites ressources, jobboards, sites carrières) : constantes partagées serveur/client.
import type { RESOURCE_CATEGORIES } from "@/db/schema";

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export const RESOURCE_CATEGORY_LABEL: Record<ResourceCategory, string> = {
  outils: "Outils & IA",
  sites_ressources: "Sites ressources",
  jobboards: "Jobboards",
  sites_carrieres: "Sites carrières",
};

export const RESOURCE_CATEGORY_HINT: Record<ResourceCategory, string> = {
  outils: "Des outils pratiques pour ta recherche : trouver un e-mail, tracker tes candidatures, créer ton CV…",
  sites_ressources: "Annuaires professionnels et organismes du secteur, utiles pour prospecter.",
  jobboards: "Les principaux sites d'offres d'alternance. Identifie de bons mots-clés et crée des alertes.",
  sites_carrieres: "Certaines entreprises publient leurs offres sur leur propre site : pense à y repasser régulièrement.",
};
