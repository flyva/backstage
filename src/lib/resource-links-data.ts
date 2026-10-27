import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { resourceFavorites, resourceLinks } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import type { ResourceCategory } from "@/lib/resource-links";
import type { ResourceRow } from "@/components/ResourceLinkList";

export async function loadResourceLinks(category: ResourceCategory): Promise<ResourceRow[]> {
  const user = await requireUser();
  const rows = await db.select().from(resourceLinks).where(eq(resourceLinks.category, category));
  const favorites = rows.length
    ? await db.select({ resourceId: resourceFavorites.resourceId }).from(resourceFavorites).where(eq(resourceFavorites.userId, user.id))
    : [];
  const favoriteIds = new Set(favorites.map((f) => f.resourceId));
  return rows.map((r) => ({
    id: r.id, label: r.label, url: r.url, description: r.description,
    favorite: favoriteIds.has(r.id), canDelete: user.perms.admin || r.createdByUserId === user.id,
  }));
}
