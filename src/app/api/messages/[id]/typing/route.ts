import { eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { emitEvent } from "@/lib/message-bus";
import { allow } from "@/lib/rate-limit";

// « Est en train d'écrire » : le navigateur prévient quand la personne tape (au plus toutes les 2,5 s). Rien n'est enregistré.
export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return new Response(null, { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response(null, { status: 404 });
  if (!allow(`typing:${user.id}`, 90, 60e3)) return new Response(null, { status: 429 });
  const [conv] = await db.select({ buyerId: conversations.buyerId, sellerId: conversations.sellerId }).from(conversations).where(eq(conversations.id, id)).limit(1);
  if (!conv || (conv.buyerId !== user.id && conv.sellerId !== user.id)) return new Response(null, { status: 404 });
  emitEvent(id, { kind: "typing", userId: user.id });
  return new Response(null, { status: 204 });
}
