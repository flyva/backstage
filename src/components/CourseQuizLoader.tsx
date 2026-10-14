"use client";

import dynamic from "next/dynamic";
import type { DbQuestion } from "@/components/CourseQuiz";

// Chargé uniquement dans le navigateur : les questions sont tirées au hasard, donc rendues côté client pour éviter un
// décalage entre la sélection du serveur et celle du navigateur (le rendu serveur ne peut pas deviner le tirage).
const CourseQuiz = dynamic(() => import("@/components/CourseQuiz").then((m) => m.CourseQuiz), {
  ssr: false,
  loading: () => <section className="card"><p className="text-sm text-muted">Chargement du quiz…</p></section>,
});

export function CourseQuizLoader({ bank, courseLabel }: { bank: DbQuestion[]; courseLabel: string }) {
  return <CourseQuiz bank={bank} courseLabel={courseLabel} />;
}
