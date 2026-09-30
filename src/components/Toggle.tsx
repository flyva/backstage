import type { ReactNode } from "react";

/**
 * Interrupteur (case à cocher stylée) avec un titre et une précision. C'est une vraie case à cocher : clavier, lecteurs d'écran
 * et envoi de formulaire fonctionnent normalement. Toute la ligne est cliquable.
 */
export function Toggle({ name, defaultChecked, title, hint }: { name: string; defaultChecked: boolean; title: ReactNode; hint?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2.5 transition hover:bg-bg has-[:checked]:border-accent/50">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      </span>
      <span className="relative inline-flex h-6 w-11 shrink-0">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
        <span className="absolute inset-0 rounded-full bg-line ring-1 ring-inset ring-line transition peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/60" />
        <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-surface shadow ring-1 ring-line transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
