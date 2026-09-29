// Domaines d'adresses email autorisés (ex. « 3is.fr »). Partagé serveur / client.

/** Liste des domaines depuis ALLOWED_EMAIL_DOMAINS (séparés par des virgules), en minuscules, sans « @ ». */
export function allowedDomainsFromEnv(raw = process.env.ALLOWED_EMAIL_DOMAINS): string[] {
  return (raw ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter((d) => /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d));
}

/**
 * Vrai si l'adresse est de la forme nom@domaine avec un domaine EXACTEMENT dans la liste.
 * Pas de sous-domaine (« a@x.3is.fr » refusé) ni de domaine qui se termine pareil (« a@evil3is.fr » refusé),
 * et une seule « @ » : « a@3is.fr@evil.com » est refusé.
 */
export function emailInDomains(email: string, domains: string[]): boolean {
  const e = email.trim().toLowerCase();
  if (e.split("@").length !== 2) return false;
  const [local, domain] = e.split("@");
  return local.length > 0 && domains.includes(domain);
}
