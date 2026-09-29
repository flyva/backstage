"use client";

import { useState } from "react";

// Champ email avec le domaine de l'école affiché à droite : on ne tape que « prenom.nom ».
// On peut toujours saisir ou coller une adresse complète (avec « @ ») : elle est alors utilisée telle quelle,
// ce qui garde le remplissage automatique du navigateur et les adresses d'un autre domaine possibles.
export function EmailField({ domain, defaultValue = "", id = "email" }: { domain?: string; defaultValue?: string; id?: string }) {
  const suffix = domain ? `@${domain}` : "";
  const initial = suffix && defaultValue.toLowerCase().endsWith(suffix) ? defaultValue.slice(0, -suffix.length) : defaultValue;
  const [value, setValue] = useState(initial);

  // Adresse envoyée au serveur : le domaine est ajouté seulement si on n'a pas tapé d'« @ ».
  const full = !domain || value.includes("@") ? value.trim() : value.trim() ? `${value.trim()}${suffix}` : "";

  if (!domain) {
    return (
      <div>
        <label className="label" htmlFor={id}>Email</label>
        <input id={id} name="email" type="email" autoComplete="email" defaultValue={defaultValue} required className="input" />
      </div>
    );
  }

  return (
    <div>
      <label className="label" htmlFor={id}>Email</label>
      <div className="flex items-stretch rounded-xl border border-line bg-bg focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
        <input
          id={id}
          type="text"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="prenom.nom"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          aria-describedby={`${id}-domain`}
          className="min-w-0 flex-1 rounded-l-xl bg-transparent px-3 py-2 text-sm outline-none"
        />
        {!value.includes("@") && (
          <span id={`${id}-domain`} className="flex select-none items-center rounded-r-xl border-l border-line px-3 text-sm text-muted">
            {suffix}
          </span>
        )}
      </div>
      <input type="hidden" name="email" value={full} />
    </div>
  );
}
