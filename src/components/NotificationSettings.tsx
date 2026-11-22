"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff } from "lucide-react";
import { removeSubscription, saveSubscription, sendTestNotification, updateNotifyPrefs } from "@/lib/push-actions";

type Prefs = { news: boolean; bde: boolean; loans: boolean; reminders: boolean; messages: boolean; listings: boolean; updates: boolean; emptyPointeuse: boolean };
type Support = "loading" | "unsupported" | "no-sw" | "denied" | "off" | "on";

function toKey(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function NotificationSettings({ publicKey, serverReady, initial }: { publicKey: string; serverReady: boolean; initial: Prefs }) {
  const [state, setState] = useState<Support>("loading");
  const [prefs, setPrefs] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    (async () => {
      let next: Support;
      if (!("Notification" in window) || !("PushManager" in window) || !("serviceWorker" in navigator)) next = "unsupported";
      else if (Notification.permission === "denied") next = "denied";
      else {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) next = "no-sw";
        else next = (await reg.pushManager.getSubscription()) ? "on" : "off";
      }
      if (alive) setState(next);
    })();
    return () => { alive = false; };
  }, []);

  async function enable() {
    setMessage(null);
    const permission = await Notification.requestPermission();
    if (permission !== "granted") { setState(permission === "denied" ? "denied" : "off"); return; }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) });
      const res = await saveSubscription(sub.toJSON());
      if (!res.ok) throw new Error(res.error);
      setState("on");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Impossible d'activer les notifications");
    }
  }

  async function disable() {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await removeSubscription(sub.endpoint);
      await sub.unsubscribe();
    }
    setState("off");
  }

  function setPref(key: keyof Prefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    startTransition(() => { void updateNotifyPrefs(next); });
  }

  if (!serverReady) {
    return <p className="text-sm text-muted">Les notifications ne sont pas encore configurées sur le serveur (clés VAPID manquantes).</p>;
  }

  return (
    <div className="space-y-4">
      {state === "loading" && <p className="text-sm text-muted">Vérification…</p>}
      {state === "unsupported" && (
        <p className="text-sm text-muted">
          Ce navigateur ne gère pas les notifications. Sur iPhone, installe d&apos;abord Backstage sur l&apos;écran d&apos;accueil (Partager → Sur l&apos;écran d&apos;accueil).
        </p>
      )}
      {state === "no-sw" && <p className="text-sm text-muted">Le service worker n&apos;est pas actif (mode développement, ou page non sécurisée). Utilise la version en ligne en HTTPS.</p>}
      {state === "denied" && <p className="text-sm text-danger">Les notifications sont bloquées pour ce site : autorise-les dans les réglages du navigateur.</p>}
      {state === "off" && (
        <button className="btn" onClick={() => void enable()}><Bell size={16} /> Activer les notifications sur cet appareil</button>
      )}
      {state === "on" && (
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => void disable()}><BellOff size={16} /> Désactiver sur cet appareil</button>
          <button
            className="btn-ghost"
            onClick={async () => {
              const { sent } = await sendTestNotification();
              setMessage(sent > 0 ? "Notification de test envoyée." : "Aucune notification envoyée (vérifie les catégories ci-dessous).");
            }}
          >
            Envoyer un test
          </button>
        </div>
      )}
      {message && <p className="text-sm text-muted" role="status">{message}</p>}

      <div className="overflow-hidden rounded-xl border border-line">
        <div className="grid grid-cols-[1fr_5rem] items-center bg-bg px-4 py-2.5">
          <div />
          <div className="text-center text-[11px] font-bold uppercase tracking-wide text-muted">Push</div>
        </div>
        <fieldset disabled={pending}>
          {([
            ["news", "Nouvelles actualités", undefined],
            ["bde", "Nouveaux évènements du BDE", undefined],
            ["loans", "Mes prêts de matériel", "Rappels de retour"],
            ["reminders", "Rappels", "Échéances de mes tâches, jour en entreprise ou à l'école demain"],
            ["messages", "Messages", "Direct, groupe ou annonce, et avis"],
            ["listings", "Nouvelles annonces", "Publiées par la promo"],
            ["updates", "Nouveautés de Backstage", "Celles marquées importantes"],
            ["emptyPointeuse", "Pointeuse vide", "Rien pointé un jour travaillé (décoché par défaut)"],
          ] as const).map(([key, label, hint]) => (
            <div key={key} className="grid grid-cols-[1fr_5rem] items-center border-t border-line px-4 py-2.5">
              <div>
                <div className="text-sm font-medium">{label}</div>
                {hint && <div className="text-xs text-muted">{hint}</div>}
              </div>
              <div className="flex justify-center">
                <label className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer">
                  <input type="checkbox" checked={prefs[key]} onChange={(e) => setPref(key, e.target.checked)} className="peer sr-only" />
                  <span className="absolute inset-0 rounded-full bg-line ring-1 ring-inset ring-line transition peer-checked:bg-accent" />
                  <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-surface shadow ring-1 ring-line transition peer-checked:translate-x-5" />
                </label>
              </div>
            </div>
          ))}
        </fieldset>
      </div>
    </div>
  );
}
