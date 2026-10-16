"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Dès qu'une ligne ou un appareil de la Charge électrique change (par soi ou par quelqu'un d'autre qui a cette page
// ouverte), on récupère les données à jour, sans recharger la page.
export function PowerLive({ projectId }: { projectId: number }) {
  const router = useRouter();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 300); // regroupe plusieurs changements rapprochés
    };
    const es = new EventSource(`/api/projects/${projectId}/charge/stream`);
    es.addEventListener("changed", refresh);
    return () => { es.close(); if (timer) clearTimeout(timer); };
  }, [projectId, router]);
  return null;
}
