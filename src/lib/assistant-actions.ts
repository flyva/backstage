"use server";

import { requireUser } from "@/lib/auth";
import { allow } from "@/lib/rate-limit";
import { answer, type AssistantReply } from "@/lib/assistant";

/** Pose une question à l'assistant (sans IA : recherche dans Backstage + tes données). */
export async function askAssistant(question: string): Promise<AssistantReply> {
  const user = await requireUser();
  const q = String(question ?? "").trim();
  if (q.length < 2) return { text: "Pose-moi une question (au moins quelques lettres).", sources: [] };
  if (!allow(`assistant:${user.id}`, 60, 10 * 60_000)) return { text: "Doucement : trop de questions d'un coup. Réessaie dans quelques minutes.", sources: [] };
  return answer(q, user);
}
