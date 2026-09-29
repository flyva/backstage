"use client";

import { useState, useSyncExternalStore } from "react";
import { Copy, Check, Settings } from "lucide-react";

export function WifiActions({ password }: { password: string }) {
  const [copied, setCopied] = useState(false);
  // Détection côté client uniquement (false au rendu serveur).
  const android = useSyncExternalStore(
    () => () => {},
    () => /android/i.test(navigator.userAgent),
    () => false,
  );

  return (
    <div className="flex flex-wrap gap-2">
      {password && (
        <button
          type="button"
          className="btn"
          onClick={async () => {
            await navigator.clipboard.writeText(password);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Copié !" : "Copier le mot de passe"}
        </button>
      )}
      {android && (
        <a href="intent:#Intent;action=android.settings.WIFI_SETTINGS;end" className="btn-ghost">
          <Settings size={16} /> Ouvrir les réglages Wi-Fi
        </a>
      )}
    </div>
  );
}
