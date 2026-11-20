"use client";

import { useSyncExternalStore, useTransition } from "react";
import { Check, Moon, Sun } from "lucide-react";
import { setSkin } from "@/lib/actions";
import { ACCENTS, ACCENT_INFO, type Accent, type ThemeMode } from "@/lib/skin";

type Skin = { theme: ThemeMode; accent: Accent };

// Applique tout de suite le thème/l'accent sur <html> (pas d'attente du serveur), puis les enregistre.
function apply(patch: { theme?: ThemeMode; accent?: Accent }) {
  const el = document.documentElement;
  if (patch.theme) el.classList.toggle("dark", patch.theme === "dark");
  if (patch.accent) el.dataset.accent = patch.accent;
}

// Le skin « vivant » est celui de <html> : les deux composants (bascule rapide et panneau) restent synchronisés.
function subscribeHtml(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-accent"] });
  return () => obs.disconnect();
}
// Une seule référence par combinaison thème/accent : useSyncExternalStore exige un snapshot stable
// (une nouvelle instance d'objet à chaque appel déclenche une boucle de rendu infinie).
const cache = new Map<string, Skin>();
const readHtml = (): Skin => {
  const el = document.documentElement;
  const accentRaw = el.dataset.accent;
  const theme: ThemeMode = el.classList.contains("dark") ? "dark" : "light";
  const accent: Accent = (ACCENTS as readonly string[]).includes(accentRaw ?? "") ? (accentRaw as Accent) : "blue";
  const key = `${theme}|${accent}`;
  let skin = cache.get(key);
  if (!skin) { skin = { theme, accent }; cache.set(key, skin); }
  return skin;
};
function useSkin(initial: Skin): Skin {
  return useSyncExternalStore(subscribeHtml, readHtml, () => initial);
}

export function QuickTheme({ initial }: { initial: Skin }) {
  const { theme } = useSkin(initial);
  const [, start] = useTransition();
  const next: ThemeMode = theme === "dark" ? "light" : "dark";
  return (
    <button
      className="iconbtn"
      aria-label={next === "dark" ? "Passer en thème sombre" : "Passer en thème clair"}
      onClick={() => { apply({ theme: next }); start(() => { void setSkin({ theme: next }); }); }}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

const seg = (on: boolean) =>
  `flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition ${on ? "bg-accent text-accent-fg" : "border border-line hover:bg-bg"}`;

export function SkinControls({ initial }: { initial: Skin }) {
  const [pending, start] = useTransition();
  const { theme, accent } = useSkin(initial);

  const change = (patch: { theme?: ThemeMode; accent?: Accent }) => {
    apply(patch);
    start(() => { void setSkin(patch); });
  };

  return (
    <div className="space-y-4 text-sm" aria-busy={pending}>
      <div>
        <div className="mb-1 text-xs text-muted">Thème</div>
        <div className="flex gap-2">
          <button className={seg(theme === "light")} onClick={() => change({ theme: "light" })}><Sun size={13} /> Clair</button>
          <button className={seg(theme === "dark")} onClick={() => change({ theme: "dark" })}><Moon size={13} /> Sombre</button>
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs text-muted">Couleur d&apos;accent</div>
        <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Couleur d'accent">
          {ACCENTS.map((a) => {
            const swatch = a === "white" ? (theme === "dark" ? "#ffffff" : "#000000") : ACCENT_INFO[a].hex;
            const swatchIsLight = a === "white" && theme === "dark";
            return (
              <button
                key={a}
                role="radio"
                aria-checked={accent === a}
                aria-label={ACCENT_INFO[a].label}
                title={ACCENT_INFO[a].label}
                onClick={() => change({ accent: a })}
                className="grid size-8 place-items-center rounded-lg outline-offset-2"
                style={{ background: swatch, boxShadow: "inset 0 0 0 1px rgba(128,128,128,.55)", outline: accent === a ? `2px solid ${swatch}` : undefined }}
              >
                {accent === a && <Check size={14} className={swatchIsLight ? "text-black" : "text-white"} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
