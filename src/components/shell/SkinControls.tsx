"use client";

import { useSyncExternalStore, useTransition } from "react";
import { Check, Moon, Sun } from "lucide-react";
import { setSkin } from "@/lib/actions";
import { ACCENTS, ACCENT_INFO, BACKGROUNDS, BACKGROUND_INFO, type Accent, type Background, type SidebarSkin, type ThemeMode } from "@/lib/skin";

// Applique tout de suite le skin sur <html> (pas d'attente du serveur), puis l'enregistre.
function apply(patch: { theme?: ThemeMode; accent?: Accent; sidebar?: SidebarSkin; background?: Background }) {
  const el = document.documentElement;
  if (patch.theme) el.classList.toggle("dark", patch.theme === "dark");
  if (patch.accent) el.dataset.accent = patch.accent;
  if (patch.sidebar) el.dataset.sidebar = patch.sidebar;
  if (patch.background) el.dataset.bg = patch.background;
}

type Skin = { theme: ThemeMode; accent: Accent; sidebar: SidebarSkin; background: Background };

// Le skin « vivant » est celui de <html> : les deux composants (bascule rapide et panneau) restent synchronisés.
function subscribeHtml(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-accent", "data-sidebar", "data-bg"] });
  return () => obs.disconnect();
}
const readHtml = () => {
  const el = document.documentElement;
  return `${el.classList.contains("dark") ? "dark" : "light"}|${el.dataset.accent ?? "blanc"}|${el.dataset.sidebar ?? "dark"}|${el.dataset.bg ?? "defaut"}`;
};
function useSkin(initial: Skin): Skin {
  const snap = useSyncExternalStore(subscribeHtml, readHtml, () => `${initial.theme}|${initial.accent}|${initial.sidebar}|${initial.background}`);
  const [theme, accent, sidebar, background] = snap.split("|");
  return { theme, accent, sidebar, background } as Skin;
}

export function QuickTheme({ initial }: { initial: Skin }) {
  const { theme } = useSkin(initial);
  const [, start] = useTransition();
  const next: ThemeMode = theme === "dark" ? "light" : "dark";
  return (
    <button
      className="grid size-9 place-items-center rounded-full border border-line text-muted hover:text-fg"
      aria-label={next === "dark" ? "Passer en thème sombre" : "Passer en thème clair"}
      onClick={() => { apply({ theme: next }); start(() => { void setSkin({ theme: next }); }); }}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

const seg = (on: boolean) =>
  `flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition ${on ? "bg-accent text-accent-fg" : "border border-line hover:bg-bg"}`;

export function SkinControls({ initial }: { initial: Skin }) {
  const [pending, start] = useTransition();
  const current = useSkin(initial);

  const change = (patch: { theme?: ThemeMode; accent?: Accent; sidebar?: SidebarSkin; background?: Background }) => {
    apply(patch);
    start(() => { void setSkin(patch); });
  };

  return (
    <div className="space-y-4 text-sm" aria-busy={pending}>
      <div>
        <div className="mb-1 text-xs text-muted">Thème</div>
        <div className="flex gap-2">
          <button className={seg(current.theme === "light")} onClick={() => change({ theme: "light" })}><Sun size={13} /> Clair</button>
          <button className={seg(current.theme === "dark")} onClick={() => change({ theme: "dark" })}><Moon size={13} /> Sombre</button>
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs text-muted">Couleur d&apos;accent</div>
        <div className="flex gap-2.5" role="radiogroup" aria-label="Couleur d'accent">
          {ACCENTS.map((a) => (
            <button
              key={a}
              role="radio"
              aria-checked={current.accent === a}
              aria-label={ACCENT_INFO[a].label}
              title={ACCENT_INFO[a].label}
              onClick={() => change({ accent: a })}
              className="grid size-7 place-items-center rounded-full outline-offset-2"
              style={{ background: ACCENT_INFO[a][current.theme], boxShadow: "inset 0 0 0 1px rgba(128,128,128,.55)", outline: current.accent === a ? `2px solid ${ACCENT_INFO[a][current.theme]}` : undefined }}
            >
              {current.accent === a && <Check size={14} className={(a === "blanc" && current.theme === "dark") || (a === "noir" && current.theme === "light") ? "text-black" : "text-white"} />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs text-muted">Couleur du menu</div>
        <div className="flex gap-2">
          <button className={seg(current.sidebar === "dark")} onClick={() => change({ sidebar: "dark" })}>Sombre</button>
          <button className={seg(current.sidebar === "light")} onClick={() => change({ sidebar: "light" })}>Blanc</button>
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs text-muted">Couleur de fond</div>
        <div className="flex gap-2.5" role="radiogroup" aria-label="Couleur de fond">
          {BACKGROUNDS.map((b) => (
            <button
              key={b}
              role="radio"
              aria-checked={current.background === b}
              aria-label={BACKGROUND_INFO[b].label}
              title={BACKGROUND_INFO[b].label}
              onClick={() => change({ background: b })}
              className="grid size-7 place-items-center rounded-full outline-offset-2"
              style={{ background: BACKGROUND_INFO[b].swatch, boxShadow: "inset 0 0 0 1px rgba(128,128,128,.55)", outline: current.background === b ? `2px solid ${BACKGROUND_INFO[b].swatch}` : undefined }}
            >
              {current.background === b && <Check size={14} className="text-black" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
