"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions";
import { saveQuestion } from "@/lib/quiz-actions";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

type Props = {
  courseKey: string;
  id?: number;
  question?: string;
  choiceA?: string; choiceB?: string; choiceC?: string; choiceD?: string;
  answer?: number;
};

export function QuestionForm({ courseKey, id, question = "", choiceA = "", choiceB = "", choiceC = "", choiceD = "", answer = 0 }: Props) {
  const [state, action, pending] = useActionState(saveQuestion, undefined);
  const k = id ?? "new";
  const choices: ["A" | "B" | "C" | "D", string][] = [["A", choiceA], ["B", choiceB], ["C", choiceC], ["D", choiceD]];
  return (
    <form action={action} className="space-y-3" key={id ? `e${id}` : state?.ok ? "done" : "new"}>
      <input type="hidden" name="courseKey" value={courseKey} />
      {id && <input type="hidden" name="id" value={id} />}
      <div>
        <label className="label" htmlFor={`qq${k}`}>Question</label>
        <textarea id={`qq${k}`} name="question" defaultValue={question} required minLength={5} maxLength={500} rows={2} className="input" />
      </div>
      <div className="space-y-2">
        <p className="label">Réponses (coche la bonne)</p>
        {choices.map(([letter, val], i) => (
          <label key={letter} className="flex items-center gap-2 rounded-xl border border-line p-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/5">
            <input type="radio" name="answer" value={i} defaultChecked={answer === i} className="size-4 accent-[var(--accent)]" />
            <span className="w-5 shrink-0 font-semibold text-muted">{letter}</span>
            <input name={`choice${letter}`} defaultValue={val} required maxLength={300} placeholder={`Réponse ${letter}`} className="input flex-1" />
          </label>
        ))}
      </div>
      <Feedback state={state} />
      <button className="btn text-sm" disabled={pending}>{pending ? "Enregistrement…" : id ? "Enregistrer" : "Ajouter la question"}</button>
    </form>
  );
}
