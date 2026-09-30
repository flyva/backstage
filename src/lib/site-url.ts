import "server-only";

/**
 * Adresse complète d'une page du site pour une redirection.
 *
 * Ne JAMAIS construire une redirection avec `new URL(chemin, req.url)` dans une route : en production, derrière le tunnel
 * Cloudflare, le serveur Next bâtit `req.url` avec son propre nom d'hôte et son port internes (https://localhost:3000/…),
 * ce qui renvoie la personne vers une adresse inaccessible. On utilise APP_URL, l'adresse publique du site.
 */
export function siteUrl(path: string, req: Request): URL {
  const fixed = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (fixed) return new URL(path, fixed);
  return new URL(path, req.url); // développement : pas d'APP_URL, l'adresse de la requête est la bonne
}
