import "server-only";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { projectMembers, projects, type ProjectRole } from "@/db/schema";
import { requireUser } from "@/lib/auth";

const RANK: Record<ProjectRole, number> = { viewer: 1, editor: 2, owner: 3 };

export const ROLE_LABEL: Record<ProjectRole, string> = {
  owner: "Propriétaire",
  editor: "Éditeur",
  viewer: "Lecteur",
};

export const can = (role: ProjectRole, min: ProjectRole) => RANK[role] >= RANK[min];

/**
 * Point d'entrée unique de l'autorisation : renvoie le projet et le rôle de
 * l'utilisateur, ou 404 s'il n'est pas membre (on ne révèle pas l'existence du projet).
 */
export async function requireProject(projectId: number, min: ProjectRole = "viewer") {
  const user = await requireUser();
  if (!Number.isInteger(projectId)) notFound();
  const [row] = await db
    .select({ project: projects, role: projectMembers.role })
    .from(projectMembers)
    .innerJoin(projects, eq(projects.id, projectMembers.projectId))
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)))
    .limit(1);
  if (!row || !can(row.role, min)) notFound();
  return { user, project: row.project, role: row.role };
}

// Modèles de checklists pour démarrer vite.
export const CHECKLIST_TEMPLATES: Record<string, { title: string; items: string[] }> = {
  montage: {
    title: "Montage",
    items: [
      "Repérage du lieu et des accès (charge, électricité)",
      "Vérifier le matériel prévu contre la fiche technique",
      "Pose de la structure / pieds et projecteurs",
      "Câblage secteur et distribution",
      "Câblage DMX / réseau",
      "Câblage audio (patch, retours)",
      "Mise sous tension progressive",
      "Test de tous les circuits",
    ],
  },
  balances: {
    title: "Balances et réglages",
    items: [
      "Réglage des projecteurs (focus, gobos, couleurs)",
      "Programmation / vérification des mémoires",
      "Lignes son : test de chaque entrée",
      "Réglage des retours et de la façade",
      "Répétition technique avec la conduite",
    ],
  },
  demontage: {
    title: "Démontage",
    items: [
      "Extinction et mise hors tension",
      "Démontage des projecteurs et structures",
      "Enroulage des câbles (étiquetés)",
      "Rangement en flight-case",
      "Inventaire du matériel",
      "Nettoyage du plateau",
    ],
  },
  securite: {
    title: "Sécurité",
    items: [
      "Vérification des élingues et sécurités (câbles de sécurité)",
      "Cheminement des câbles sécurisé (passe-câbles)",
      "Issues de secours dégagées",
      "Extincteurs accessibles",
      "Consignes données à l'équipe",
    ],
  },
};
