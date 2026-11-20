import "server-only";
import { cookies } from "next/headers";

const OPTIONS = { path: "/", maxAge: 31536000, sameSite: "lax" as const };

/** Cookie du thème (clair/sombre) : lu par le layout racine pour l'affichage immédiat. */
export async function writeSkinCookies(skin: { theme: string }) {
  const jar = await cookies();
  jar.set("theme", skin.theme, OPTIONS);
}
