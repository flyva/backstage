"use client";

import { useActionState, useState } from "react";
import { changePassword, login, register, updateProfile, saveSettings, type FormState } from "@/lib/actions";
import { PasswordField } from "@/components/PasswordField";
import { EmailField } from "@/components/EmailField";
import { AddressField } from "@/components/AddressField";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

export function LoginForm({ emailDomain }: { emailDomain?: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <EmailField key={state?.values?.email} domain={emailDomain} defaultValue={state?.values?.email} />
      <PasswordField id="password" name="password" label="Mot de passe" autoComplete="current-password" />
      <Feedback state={state} />
      <button className="btn w-full" disabled={pending}>{pending ? "Connexion…" : "Se connecter"}</button>
    </form>
  );
}

export function RegisterForm({ codeRequired = false, emailDomain }: { codeRequired?: boolean; emailDomain?: string }) {
  const [state, action, pending] = useActionState(register, undefined);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const mismatch = pw2 !== "" && pw !== pw2;
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="firstName">Prénom</label>
          <input id="firstName" name="firstName" autoComplete="given-name" defaultValue={state?.values?.firstName} maxLength={60} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="lastName">Nom</label>
          <input id="lastName" name="lastName" autoComplete="family-name" defaultValue={state?.values?.lastName} maxLength={60} required className="input" />
        </div>
      </div>
      <EmailField key={state?.values?.email} domain={emailDomain} defaultValue={state?.values?.email} />
      <PasswordField id="password" name="password" label="Mot de passe (8 caractères min.)" autoComplete="new-password" minLength={8} onValueChange={setPw} />
      <div>
        <PasswordField id="password2" name="password2" label="Confirme le mot de passe" autoComplete="new-password" minLength={8} onValueChange={setPw2} invalid={mismatch} />
        {mismatch && <p className="mt-1 text-xs text-danger" role="alert">Les deux mots de passe ne correspondent pas.</p>}
      </div>
      {codeRequired && (
        <div>
          <label className="label" htmlFor="code">Code d&apos;invitation</label>
          <input id="code" name="code" required autoComplete="off" className="input" />
          <p className="mt-1 text-xs text-muted">Demandé à la personne qui gère Backstage.</p>
        </div>
      )}
      <Feedback state={state} />
      <button className="btn w-full" disabled={pending || mismatch}>{pending ? "Création…" : "Créer mon compte"}</button>
    </form>
  );
}

export function ProfileForm(props: { firstName: string; lastName: string; homeAddress: string; icalUrl: string }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="firstName">Prénom</label>
          <input id="firstName" name="firstName" autoComplete="given-name" defaultValue={props.firstName} maxLength={60} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="lastName">Nom</label>
          <input id="lastName" name="lastName" autoComplete="family-name" defaultValue={props.lastName} maxLength={60} required className="input" />
        </div>
      </div>
      <AddressField
        id="homeAddress"
        name="homeAddress"
        label="Adresse du domicile"
        defaultValue={props.homeAddress}
        hint="Commence à taper (numéro, rue, ville) et choisis dans la liste. Sert aux horaires de tram/bus et aux stations Le Vélo proches de chez toi."
      />
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
        <AddressField id="school_address" name="school_address" label="Adresse de l'école" defaultValue={values.school_address ?? ""} placeholder="Adresse de l'école, Bordeaux" />
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

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const mismatch = pw2 !== "" && pw !== pw2;
  return (
    // key : le formulaire est vidé (et donc les mots de passe effacés de l'écran) après un succès.
    <form action={action} className="space-y-4" key={state?.ok ? "done" : "form"}>
      <PasswordField id="currentPassword" name="currentPassword" label="Mot de passe actuel" autoComplete="current-password" />
      <PasswordField id="newPassword" name="newPassword" label="Nouveau mot de passe (8 caractères min.)" autoComplete="new-password" minLength={8} onValueChange={setPw} />
      <div>
        <PasswordField id="newPassword2" name="newPassword2" label="Confirme le nouveau mot de passe" autoComplete="new-password" minLength={8} onValueChange={setPw2} invalid={mismatch} />
        {mismatch && <p className="mt-1 text-xs text-danger" role="alert">Les deux mots de passe ne correspondent pas.</p>}
      </div>
      <Feedback state={state} />
      <button className="btn" disabled={pending || mismatch}>{pending ? "Enregistrement…" : "Changer le mot de passe"}</button>
    </form>
  );
}
