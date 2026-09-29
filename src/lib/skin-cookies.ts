import "server-only";
import { cookies } from "next/headers";

const OPTIONS = { path: "/", maxAge: 31536000, sameSite: "lax" as const };

/** Cookies du skin personnel (thème, accent, menu) : lus par le layout racine pour l'affichage immédiat. */
export async function writeSkinCookies(skin: { theme: string; accent: string; sidebar: string }) {
  const jar = await cookies();
  jar.set("theme", skin.theme, OPTIONS);
  jar.set("accent", skin.accent, OPTIONS);
  jar.set("sidebar", skin.sidebar, OPTIONS);
}
