"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff } from "lucide-react";
import { removeSubscription, saveSubscription, sendTestNotification, updateNotifyPrefs } from "@/lib/push-actions";

type Prefs = { news: boolean; bde: boolean; loans: boolean };
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

      <fieldset className="space-y-2" disabled={pending}>
        <legend className="label">Me prévenir pour…</legend>
        {([
          ["news", "Nouvelles actualités"],
          ["bde", "Nouveaux évènements du BDE"],
          ["loans", "Mes prêts de matériel (rappels de retour)"],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={prefs[key]} onChange={(e) => setPref(key, e.target.checked)} className="size-4 accent-[var(--accent)]" />
            {label}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
