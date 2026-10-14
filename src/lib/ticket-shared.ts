import type { TicketStatus } from "@/db/schema";

// Constantes partagées entre composants serveur et client : jamais dans un fichier "use client" (les valeurs plates
// d'un module client ne sont pas lisibles depuis un composant serveur une fois le build fait).
export const STATUS_LABEL: Record<TicketStatus, string> = { open: "Ouvert", in_progress: "En cours", closed: "Fermé" };
export const STATUS_COLOR: Record<TicketStatus, string> = { open: "#dc3545", in_progress: "#f59e0b", closed: "#28a745" };
