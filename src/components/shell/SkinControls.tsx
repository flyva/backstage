"use client";

import { useSyncExternalStore, useTransition } from "react";
import { Moon, Sun } from "lucide-react";
import { setSkin } from "@/lib/actions";
import type { ThemeMode } from "@/lib/skin";

// Applique tout de suite le thème sur <html> (pas d'attente du serveur), puis l'enregistre.
function apply(theme: ThemeMode) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

// Le thème « vivant » est celui de <html> : les deux composants (bascule rapide et panneau) restent synchronisés.
function subscribeHtml(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}
const readHtml = (): ThemeMode => (document.documentElement.classList.contains("dark") ? "dark" : "light");
function useTheme(initial: ThemeMode): ThemeMode {
  return useSyncExternalStore(subscribeHtml, readHtml, () => initial);
}

export function QuickTheme({ initial }: { initial: { theme: ThemeMode } }) {
  const theme = useTheme(initial.theme);
  const [, start] = useTransition();
  const next: ThemeMode = theme === "dark" ? "light" : "dark";
  return (
    <button
      className="iconbtn"
      aria-label={next === "dark" ? "Passer en thème sombre" : "Passer en thème clair"}
      onClick={() => { apply(next); start(() => { void setSkin({ theme: next }); }); }}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

const seg = (on: boolean) =>
  `flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition ${on ? "bg-accent text-accent-fg" : "border border-line hover:bg-bg"}`;

export function SkinControls({ initial }: { initial: { theme: ThemeMode } }) {
  const [pending, start] = useTransition();
  const theme = useTheme(initial.theme);

  const change = (next: ThemeMode) => {
    apply(next);
    start(() => { void setSkin({ theme: next }); });
  };

  return (
    <div className="space-y-4 text-sm" aria-busy={pending}>
      <div>
        <div className="mb-1 text-xs text-muted">Thème</div>
        <div className="flex gap-2">
          <button className={seg(theme === "light")} onClick={() => change("light")}><Sun size={13} /> Clair</button>
          <button className={seg(theme === "dark")} onClick={() => change("dark")}><Moon size={13} /> Sombre</button>
        </div>
      </div>
    </div>
  );
}
