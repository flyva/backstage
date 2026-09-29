"use client";

import { useEffect } from "react";

// Le service worker n'est enregistré qu'en production : en développement il masquerait les changements de code.
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
