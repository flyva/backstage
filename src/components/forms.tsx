"use client";

import { useActionState } from "react";
import { login, register, updateProfile, saveSettings, type FormState } from "@/lib/actions";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" defaultValue={state?.values?.email} required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">Mot de passe</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </div>
      <Feedback state={state} />
      <button className="btn w-full" disabled={pending}>{pending ? "Connexion…" : "Se connecter"}</button>
    </form>
  );
}

export function RegisterForm({ codeRequired = false }: { codeRequired?: boolean }) {
  const [state, action, pending] = useActionState(register, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">Prénom et nom</label>
        <input id="name" name="name" autoComplete="name" defaultValue={state?.values?.name} required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" defaultValue={state?.values?.email} required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">Mot de passe (8 caractères min.)</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="input" />
      </div>
      {codeRequired && (
        <div>
          <label className="label" htmlFor="code">Code d&apos;invitation</label>
          <input id="code" name="code" required autoComplete="off" className="input" />
          <p className="mt-1 text-xs text-muted">Demandé à la personne qui gère Backstage.</p>
        </div>
      )}
      <Feedback state={state} />
      <button className="btn w-full" disabled={pending}>{pending ? "Création…" : "Créer mon compte"}</button>
    </form>
  );
}

export function ProfileForm(props: { name: string; homeAddress: string; icalUrl: string }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">Nom</label>
        <input id="name" name="name" defaultValue={props.name} required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="homeAddress">Adresse du domicile</label>
        <input id="homeAddress" name="homeAddress" defaultValue={props.homeAddress} placeholder="12 rue Exemple, 33000 Bordeaux" className="input" />
        <p className="mt-1 text-xs text-muted">Sert aux horaires de tram/bus et aux stations V³ proches de chez toi.</p>
      </div>
      <div>
        <label className="label" htmlFor="icalUrl">Lien iCalendar Ypareo</label>
        <input id="icalUrl" name="icalUrl" defaultValue={props.icalUrl} placeholder="https://…" className="input" />
      </div>
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
    </form>
  );
}

export function SettingsForm({ values }: { values: Record<string, string> }) {
  const [state, action, pending] = useActionState(saveSettings, undefined);
  const field = (key: string, label: string, placeholder = "") => (
    <div key={key}>
      <label className="label" htmlFor={key}>{label}</label>
      <input id={key} name={key} defaultValue={values[key] ?? ""} placeholder={placeholder} className="input" />
    </div>
  );
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {field("wifi_ssid", "Nom du réseau Wi-Fi")}
        {field("wifi_password", "Mot de passe Wi-Fi")}
        <div>
          <label className="label" htmlFor="wifi_security">Sécurité</label>
          <select id="wifi_security" name="wifi_security" defaultValue={values.wifi_security ?? "WPA"} className="input">
            <option value="WPA">WPA / WPA2</option>
            <option value="WEP">WEP</option>
            <option value="nopass">Aucune</option>
          </select>
        </div>
        {field("school_address", "Adresse de l'école")}
        {field("webmail_url", "Lien webmail 3IS", "https://…")}
        {field("ypareo_url", "Lien Ypareo", "https://…")}
        {field("studea_url", "Lien Studea", "https://…")}
        {field("school_instagram_url", "Instagram de l'école", "https://instagram.com/…")}
        {field("instagram_feed_url", "Flux Instagram (URL JSON)", "https://feeds.behold.so/…")}
      </div>
      <div>
        <label className="label" htmlFor="school_map">Plan de l&apos;école (image PNG, JPG ou WebP)</label>
        <input id="school_map" name="school_map" type="file" accept="image/png,image/jpeg,image/webp" className="input" />
      </div>
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer les paramètres"}</button>
    </form>
  );
}
