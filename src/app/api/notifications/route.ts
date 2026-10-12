import { getUser } from "@/lib/auth";
import { loadNotifications } from "@/lib/notifications";

// Relu toutes les minutes par la cloche (NotificationBell) : une nouvelle notification arrive sans recharger la page.
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser();
  if (!user) return new Response("Non autorisé", { status: 401 });
  const { items, unread } = await loadNotifications(user);
  return Response.json({ items, unread });
}
