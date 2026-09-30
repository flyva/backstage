"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, Maximize, RotateCcw } from "lucide-react";

export type ShowCue = {
  id: number;
  label: string;
  title: string;
  category: string;
  durationSec: number | null;
  notes: string | null;
};

type ShowState = { index: number; cueStartedAt: number | null; showStartedAt: number | null };
const EMPTY: ShowState = { index: -1, cueStartedAt: null, showStartedAt: null };

// ---- petit store branché sur localStorage (l'état survit à un rechargement de page) ----
const listeners = new Set<() => void>();
const subscribeStore = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
};
const readRaw = (key: string) => {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
};
const write = (key: string, s: ShowState) => {
  try {
    localStorage.setItem(key, JSON.stringify(s));
  } catch {
    /* stockage indisponible : le mode marche quand même jusqu'au rechargement */
  }
  listeners.forEach((l) => l());
};

// Horloge à la seconde.
const subscribeClock = (cb: () => void) => {
  const t = setInterval(cb, 250);
  return () => clearInterval(t);
};
const clock = () => Math.floor(Date.now() / 1000);

const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
};

export function ShowMode({ projectId, projectName, cues }: { projectId: number; projectName: string; cues: ShowCue[] }) {
  const key = `backstage:show:${projectId}`;
  const raw = useSyncExternalStore(subscribeStore, () => readRaw(key), () => null);
  const nowSec = useSyncExternalStore(subscribeClock, clock, () => 0);

  const state: ShowState = useMemo(() => {
    if (!raw) return EMPTY;
    try {
      const s = JSON.parse(raw) as ShowState;
      return s.index >= -1 && s.index < cues.length ? s : EMPTY;
    } catch {
      return EMPTY;
    }
  }, [raw, cues.length]);

  const go = useCallback(() => {
    if (state.index >= cues.length - 1) return;
    const now = Date.now();
    write(key, { index: state.index + 1, cueStartedAt: now, showStartedAt: state.showStartedAt ?? now });
  }, [key, state, cues.length]);

  const back = useCallback(() => {
    if (state.index < 0) return;
    write(key, { ...state, index: state.index - 1, cueStartedAt: Date.now() });
  }, [key, state]);

  const reset = useCallback(() => {
    if (state.index >= 0 && !confirm("Remettre le spectacle à zéro ?")) return;
    write(key, EMPTY);
  }, [key, state.index]);

  // Raccourcis clavier : Espace / → = GO, ← = retour.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest("input, textarea, select, button")) return;
      if (e.code === "Space" || e.key === "ArrowRight") { e.preventDefault(); go(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); back(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, back]);

  // Empêche l'écran de se mettre en veille pendant le spectacle.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = () => navigator.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    request();
    const onVisible = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, []);

  if (raw === null) return <p className="text-sm text-muted">Chargement…</p>;

  const current = state.index >= 0 ? cues[state.index] : null;
  const next = cues[state.index + 1] ?? null;
  const cueElapsed = state.cueStartedAt ? nowSec - Math.floor(state.cueStartedAt / 1000) : 0;
  const showElapsed = state.showStartedAt ? nowSec - Math.floor(state.showStartedAt / 1000) : 0;
  const remaining = current?.durationSec != null ? current.durationSec - cueElapsed : null;
  const over = remaining !== null && remaining < 0;
  const finished = state.index === cues.length - 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        <span className="truncate font-medium text-fg">{projectName}</span>
        <span className="flex items-center gap-3">
          <span className="tabular-nums">Spectacle : <strong className="text-fg">{fmt(showElapsed)}</strong></span>
          <button type="button" className="btn-ghost px-2 py-1" aria-label="Plein écran" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.(); }}><Maximize size={16} /></button>
        </span>
      </div>

      <section className="card space-y-3 py-8 text-center" aria-live="polite">
        {current ? (
          <>
            <div className="font-mono text-sm text-accent">CUE {current.label} · {current.category}</div>
            <h2 className="text-3xl font-bold leading-tight sm:text-5xl">{current.title}</h2>
            {current.notes && <p className="mx-auto max-w-2xl whitespace-pre-line text-lg text-muted">{current.notes}</p>}
            <div className={`font-mono text-4xl font-bold tabular-nums ${over ? "text-danger" : ""}`}>
              {remaining !== null ? (over ? `+${fmt(-remaining)}` : fmt(remaining)) : fmt(cueElapsed)}
            </div>
            <div className="text-xs text-muted">
              {remaining !== null ? (over ? "dépassement" : `restant sur ${fmt(current.durationSec!)}`) : "écoulé"}
            </div>
          </>
        ) : (
          <>
            <div className="text-sm text-muted">Prêt</div>
            <h2 className="text-3xl font-bold sm:text-4xl">En attente du premier GO</h2>
          </>
        )}
      </section>

      <div className="flex gap-2">
        <button onClick={back} disabled={state.index < 0} className="btn-ghost px-4 py-4" aria-label="Cue précédente">
          <ChevronLeft size={22} />
        </button>
        <button onClick={go} disabled={finished} className="btn flex-1 py-4 text-xl font-bold">
          {finished ? "Fin du spectacle" : state.index < 0 ? "GO" : "GO cue suivante"} <ChevronRight size={22} />
        </button>
        <button onClick={reset} className="btn-ghost px-4 py-4" aria-label="Remise à zéro"><RotateCcw size={20} /></button>
      </div>
      <p className="text-center text-xs text-muted">Espace ou → pour GO · ← pour revenir</p>

      {next && (
        <section className="card flex items-center gap-3 p-3 text-sm">
          <span className="text-xs uppercase tracking-wide text-muted">Ensuite</span>
          <span className="font-mono text-accent">{next.label}</span>
          <span className="min-w-0 flex-1 truncate font-medium">{next.title}</span>
          <span className="text-xs text-muted">{next.category}</span>
        </section>
      )}

      <ol className="divide-y divide-line rounded-xl border border-line bg-surface text-sm">
        {cues.map((c, i) => (
          <li
            key={c.id}
            className={`flex items-center gap-3 px-3 py-2 ${i === state.index ? "bg-accent/15 font-medium" : i < state.index ? "text-muted line-through" : ""}`}
          >
            <span className="w-10 font-mono text-xs text-accent">{c.label}</span>
            <span className="min-w-0 flex-1 truncate">{c.title}</span>
            <span className="text-xs text-muted">{c.category}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
