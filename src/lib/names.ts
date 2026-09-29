// Prénom / nom : partagé serveur et client.

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** « Prénom Nom » affiché partout dans l'application. */
export const joinName = (first: string, last: string) => `${clean(first)} ${clean(last)}`.trim();

/**
 * Sépare un nom complet quand on n'a pas mieux (comptes Microsoft/Google sans prénom/nom distincts) :
 * le premier mot est le prénom, le reste est le nom.
 */
export function splitName(full: string): { first: string; last: string } {
  const parts = clean(full).split(" ").filter(Boolean);
  if (parts.length <= 1) return { first: parts[0] ?? "", last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}
