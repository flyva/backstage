import "server-only";
import { db } from "@/db";
import { adminAuditLog } from "@/db/schema";

/** Trace un accès ou une action d'administration sur la fiche de quelqu'un (RGPD : qui a vu/modifié les données de qui). */
export async function logAdminAction(adminId: number, action: string, targetUserId: number | null, detail?: string) {
  await db.insert(adminAuditLog).values({ adminId, action, targetUserId, detail: detail ? detail.slice(0, 300) : null }).catch(() => {});
}
