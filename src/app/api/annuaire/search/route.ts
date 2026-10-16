import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { allow } from "@/lib/rate-limit";
import { avatarUrl } from "@/lib/avatar-files";
import { school3isEmail } from "@/lib/people-shared";

// Autocomplétion de l'annuaire pour la recherche du haut : mêmes règles de visibilité que la page Annuaire
// (compte actif, « dans l'annuaire » activé, téléphone seulement si la personne l'a choisi).
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Non connecté" }, { status: 401 });
  if (!allow(`annuaire-search:${user.id}`, 60, 60e3)) return Response.json({ error: "Trop de requêtes" }, { status: 429 });

  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (q.length < 2) return Response.json({ people: [] });

  const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const rows = await db
    .select()
    .from(users)
    .where(and(
      eq(users.status, "active"),
      eq(users.showInDirectory, true),
      or(
        sql`${users.firstName} like ${like}`,
        sql`${users.lastName} like ${like}`,
        sql`${users.name} like ${like}`,
        sql`${users.email} like ${like}`,
        sql`${users.phone} like ${like}`,
      ),
    ))
    .limit(8);

  const people = rows.map((u) => ({
    id: u.id,
    name: u.name,
    avatar: avatarUrl(u.avatarFile),
    email3is: school3isEmail(u.email),
    phone: u.showPhone ? u.phone : null,
  }));
  return Response.json({ people }, { headers: { "Cache-Control": "private, max-age=30" } });
}
