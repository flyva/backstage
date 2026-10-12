"use client";

import dynamic from "next/dynamic";

// Chargé uniquement dans le navigateur : les questions sont tirées au hasard, donc rendues côté client pour éviter un
// décalage entre la sélection du serveur et celle du navigateur (le rendu serveur ne peut pas deviner le tirage).
const Quiz = dynamic(() => import("@/components/Quiz").then((m) => m.Quiz), {
  ssr: false,
  loading: () => <section className="card"><p className="text-sm text-muted">Chargement du quiz…</p></section>,
});

export function QuizLoader() {
  return <Quiz />;
}
