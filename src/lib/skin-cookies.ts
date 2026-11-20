import "server-only";
import { cookies } from "next/headers";

const OPTIONS = { path: "/", maxAge: 31536000, sameSite: "lax" as const };

/** Cookies du thème (clair/sombre) et de l'accent : lus par le layout racine pour l'affichage immédiat. */
export async function writeSkinCookies(skin: { theme: string; accent: string }) {
  const jar = await cookies();
  jar.set("theme", skin.theme, OPTIONS);
  jar.set("accent", skin.accent, OPTIONS);
}
