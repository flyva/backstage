"use client";

import { useActionState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { generateSheet } from "@/lib/course-actions";

// Bouton « Générer une fiche de révision » : indique que ça travaille (la réponse de l'IA prend quelques secondes) et affiche l'erreur éventuelle.
export function SheetButton({ subjectKey, again }: { subjectKey: string; again: boolean }) {
  const [state, action, pending] = useActionState(generateSheet, undefined);
  return (
    <form action={action} className="space-y-1.5">
      <input type="hidden" name="key" value={subjectKey} />
      <button className="btn-ghost text-xs" disabled={pending}>
        {pending ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Sparkles size={14} aria-hidden />}
        {pending ? "Génération en cours… (quelques secondes)" : again ? "Régénérer la fiche de révision" : "Générer une fiche de révision (IA)"}
      </button>
      {state?.error && <p className="text-xs text-danger" role="alert">{state.error}</p>}
    </form>
  );
}
