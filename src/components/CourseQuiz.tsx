"use client";

import { useState } from "react";
import { Check, RotateCcw, ShieldCheck, X } from "lucide-react";

export type DbQuestion = { id: number; question: string; choiceA: string; choiceB: string; choiceC: string; choiceD: string; answer: number };
type PickedQuestion = { id: number; q: string; choices: [string, string, string, string]; answer: number; picked: number | null };

/** Mélange et prend `n` éléments (Fisher-Yates partiel). */
function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

const toPicked = (rows: DbQuestion[]): PickedQuestion[] =>
  rows.map((r) => ({ id: r.id, q: r.question, choices: [r.choiceA, r.choiceB, r.choiceC, r.choiceD], answer: r.answer, picked: null }));

export function CourseQuiz({ bank, courseLabel }: { bank: DbQuestion[]; courseLabel: string }) {
  const count = Math.min(10, bank.length);
  const [questions, setQuestions] = useState<PickedQuestion[]>(() => toPicked(pickRandom(bank, count)));
  const [done, setDone] = useState(false);

  if (bank.length === 0) {
    return (
      <section className="card space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck size={18} className="text-accent" aria-hidden /> Quiz {courseLabel}</h2>
        <p className="text-sm text-muted">Aucune question pour l&apos;instant dans la banque de ce cours. Un admin peut en ajouter depuis Administration → Quiz.</p>
      </section>
    );
  }

  const restart = () => {
    setQuestions(toPicked(pickRandom(bank, count)));
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
        <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck size={18} className="text-accent" aria-hidden /> Quiz {courseLabel} : {count} question{count > 1 ? "s" : ""}</h2>
        <span className="text-sm text-muted">{bank.length} question{bank.length > 1 ? "s" : ""} en tout, {count} tirée{count > 1 ? "s" : ""} au hasard.</span>
      </div>

      <ol className="space-y-4">
        {questions.map((q, qi) => (
          <li key={q.id} className="space-y-2">
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
        <button type="button" className="btn" disabled={answered < count} onClick={() => setDone(true)}>
          {answered < count ? `Réponds aux ${count} questions (${answered}/${count})` : "Voir mon score"}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold">
            Score : <span className={score >= count * 0.7 ? "text-emerald-600 dark:text-emerald-400" : score >= count * 0.5 ? "text-amber-600 dark:text-amber-400" : "text-danger"}>{score} / {count}</span>
          </p>
          <button type="button" onClick={restart} className="btn-ghost text-sm"><RotateCcw size={15} aria-hidden /> Recommencer avec {count} nouvelles questions</button>
        </div>
      )}
    </section>
  );
}
