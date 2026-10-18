"use client";

import { useSyncExternalStore } from "react";
import { Cookie } from "lucide-react";

const KEY = "backstage:cookie-notice-vu";
const listeners = new Set<() => void>();

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const readSeen = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false; // stockage indisponible : on affiche quand même, par précaution
  }
};

// Bandeau d'information (pas de consentement à recueillir : uniquement des cookies strictement nécessaires au
// fonctionnement du site — session et préférences d'affichage). Juste masqué une fois lu, mémorisé sur cet appareil.
export function CookieBanner() {
  const seen = useSyncExternalStore(subscribe, readSeen, () => true); // côté serveur : pas affiché avant d'être sûr

  const dismiss = () => {
    try { localStorage.setItem(KEY, "1"); } catch { /* tant pis : réapparaîtra au prochain chargement */ }
    listeners.forEach((l) => l());
  };

  if (seen) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface p-3 shadow-lg print:hidden">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 text-sm">
        <Cookie size={18} className="shrink-0 text-accent" aria-hidden />
        <p className="min-w-0 flex-1 text-muted">
          Ce site utilise des cookies strictement nécessaires à son fonctionnement (connexion, préférences d&apos;affichage) : aucun suivi publicitaire, aucune mesure d&apos;audience.{" "}
          <a href="/politique-de-confidentialite" className="text-accent underline">En savoir plus</a>
        </p>
        <button onClick={dismiss} className="btn shrink-0 px-4 py-1.5 text-xs">J&apos;ai compris</button>
      </div>
    </div>
  );
}
