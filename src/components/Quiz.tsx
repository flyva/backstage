"use client";

import { useState } from "react";
import { Check, RotateCcw, ShieldCheck, X } from "lucide-react";
import { QUIZ_QUESTIONS, type QuizQuestion } from "@/lib/habilitation-quiz";

const COUNT = 10;

/** Mélange et prend `n` éléments (Fisher-Yates partiel). */
function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

type Picked = QuizQuestion & { picked: number | null };

export function Quiz() {
  const [questions, setQuestions] = useState<Picked[]>(() => pickRandom(QUIZ_QUESTIONS, COUNT).map((q) => ({ ...q, picked: null })));
  const [done, setDone] = useState(false);

  const restart = () => {
    setQuestions(pickRandom(QUIZ_QUESTIONS, COUNT).map((q) => ({ ...q, picked: null })));
    setDone(false);
  };
  const choose = (qi: number, ci: number) => {
    if (done) return;
    setQuestions((cur) => cur.map((q, i) => (i === qi ? { ...q, picked: ci } : q)));
  };
  const answered = questions.filter((q) => q.picked !== null).length;
  const score = questions.filter((q) => q.picked === q.answer).length;

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck size={18} className="text-accent" aria-hidden /> Teste-toi : 10 questions</h2>
        <span className="text-sm text-muted">{QUIZ_QUESTIONS.length} questions en tout, {COUNT} tirées au hasard.</span>
      </div>

      <ol className="space-y-4">
        {questions.map((q, qi) => (
          <li key={`${qi}-${q.q}`} className="space-y-2">
            <p className="text-sm font-medium">{qi + 1}. {q.q}</p>
            <div className="grid gap-1.5">
              {q.choices.map((c, ci) => {
                const picked = q.picked === ci;
                const showResult = done && q.picked !== null;
                const isRight = ci === q.answer;
                const cls = showResult
                  ? isRight
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : picked
                      ? "border-danger/60 bg-danger/10 text-danger"
                      : "border-line text-muted"
                  : picked
                    ? "border-accent bg-accent/10"
                    : "border-line hover:border-accent/50";
                return (
                  <button
                    key={ci}
                    type="button"
                    disabled={done}
                    onClick={() => choose(qi, ci)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${cls}`}
                  >
                    {showResult && isRight && <Check size={14} className="shrink-0" aria-hidden />}
                    {showResult && picked && !isRight && <X size={14} className="shrink-0" aria-hidden />}
                    <span>{c}</span>
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      {!done ? (
        <button type="button" className="btn" disabled={answered < COUNT} onClick={() => setDone(true)}>
          {answered < COUNT ? `Réponds aux ${COUNT} questions (${answered}/${COUNT})` : "Voir mon score"}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold">
            Score : <span className={score >= 7 ? "text-emerald-600 dark:text-emerald-400" : score >= 5 ? "text-amber-600 dark:text-amber-400" : "text-danger"}>{score} / {COUNT}</span>
          </p>
          <button type="button" onClick={restart} className="btn-ghost text-sm"><RotateCcw size={15} aria-hidden /> Recommencer avec 10 nouvelles questions</button>
        </div>
      )}
    </section>
  );
}
