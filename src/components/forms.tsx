"use client";

import { useActionState, useState } from "react";
import { changePassword, login, register, saveRequestNote, updateIcalUrl, updateProfile, saveSettings, type FormState } from "@/lib/actions";
import { PasswordField } from "@/components/PasswordField";
import { EmailField } from "@/components/EmailField";
import { AddressField } from "@/components/AddressField";
import { MarkdownField } from "@/components/MarkdownField";

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
      <label className="flex items-start gap-2.5 text-sm">
        <input type="checkbox" name="cgu" required className="mt-0.5 size-4 accent-[var(--accent)]" />
        <span>
          J&apos;accepte les <a href="/cgu" target="_blank" rel="noopener noreferrer" className="text-accent underline">CGU</a>,
          les <a href="/mentions-legales" target="_blank" rel="noopener noreferrer" className="text-accent underline">mentions légales</a> et
          la <a href="/politique-de-confidentialite" target="_blank" rel="noopener noreferrer" className="text-accent underline">politique de confidentialité</a>.
        </span>
      </label>
      <Feedback state={state} />
      <button className="btn w-full" disabled={pending || mismatch || !!state?.ok}>{pending ? "Création…" : "Créer mon compte"}</button>
    </form>
  );
}

type ProfileFormProps = {
  firstName: string; lastName: string; email: string; personalEmail: string;
  homeAddress: string; companyName: string; companyAddress: string;
  phone: string; phonePro: string; birthDate: string; discord: string;
};

// Un seul formulaire pour Identité + Coordonnées (un seul bouton Enregistrer), repris à l'identique de la page Profil
// de BDE (ProfilClient.tsx > TabProfil) : Nom/Prénom/Mail 3IS gérés par l'administration (champs désactivés, jamais
// envoyés — l'action garde la valeur existante), seul « Mail personnel » est modifiable (pour le bouton Google de la
// page de connexion). Téléphone/téléphone pro/date de naissance/Discord dans Coordonnées (déménagés depuis l'onglet
// Annuaire, toujours modifiables là-bas aussi : AnnuaireForm les reporte en champs cachés).
export function ProfileForm({ firstName, lastName, email, personalEmail, homeAddress, companyName, companyAddress, phone, phonePro, birthDate, discord }: ProfileFormProps) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted">Identité</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="lastName">Nom</label>
            <input id="lastName" defaultValue={lastName} disabled className="input bg-bg text-muted" />
          </div>
          <div>
            <label className="label" htmlFor="firstName">Prénom</label>
            <input id="firstName" defaultValue={firstName} disabled className="input bg-bg text-muted" />
          </div>
          <div>
            <label className="label" htmlFor="_email">Mail 3IS</label>
            <input id="_email" type="email" defaultValue={email} disabled className="input bg-bg text-muted" />
          </div>
          <div>
            <label className="label" htmlFor="personalEmail">Mail personnel</label>
            <input id="personalEmail" name="personalEmail" type="email" defaultValue={personalEmail} placeholder="perso@gmail.com" className="input" />
          </div>
        </div>
        <p className="text-xs text-muted">Nom, prénom et mail 3IS sont gérés par l&apos;administration.</p>
        <p className="text-xs text-muted">Ajoute ton adresse Gmail personnelle pour pouvoir te connecter via le bouton Google sur la page de connexion.</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted">Coordonnées</h3>
        <AddressField
          id="homeAddress"
          name="homeAddress"
          label="Adresse du domicile"
          defaultValue={homeAddress}
          hint="Commence à taper (numéro, rue, ville) et choisis dans la liste. Sert aux horaires de tram/bus et aux stations Le Vélo proches de chez toi."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="phone">Téléphone</label>
            <input id="phone" name="phone" defaultValue={phone} maxLength={30} inputMode="tel" autoComplete="tel" placeholder="06 12 34 56 78" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="phonePro">Téléphone pro (facultatif)</label>
            <input id="phonePro" name="phonePro" defaultValue={phonePro} maxLength={30} inputMode="tel" autoComplete="off" placeholder="06 00 00 00 00" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="birthDate">Date de naissance</label>
            <input id="birthDate" name="birthDate" type="date" defaultValue={birthDate} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="discord">Discord (facultatif)</label>
            <input id="discord" name="discord" defaultValue={discord} maxLength={40} autoComplete="off" placeholder="pseudo#0000" className="input" />
          </div>
        </div>
        <p className="text-xs text-muted">Le Discord et le téléphone ne sont visibles de personne par défaut — gère leur affichage dans Annuaire et Carte de visite.</p>
        <div className="space-y-4 rounded-xl border border-line p-4">
          <div>
            <h3 className="text-sm font-semibold">Entreprise (alternance)</h3>
            <p className="text-xs text-muted">Facultatif : sert à calculer ton trajet et à voir les transports autour de ton lieu de travail (page Mobilité).</p>
          </div>
          <div>
            <label className="label" htmlFor="companyName">Nom de l&apos;entreprise</label>
            <input id="companyName" name="companyName" defaultValue={companyName} maxLength={120} autoComplete="off" className="input" />
          </div>
          <AddressField id="companyAddress" name="companyAddress" label="Adresse de l'entreprise" defaultValue={companyAddress} />
        </div>
      </div>

      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
    </form>
  );
}

export function IcalForm({ icalUrl }: { icalUrl: string }) {
  const [state, action, pending] = useActionState(updateIcalUrl, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="icalUrl">Lien iCalendar Ypareo</label>
        <input id="icalUrl" name="icalUrl" defaultValue={icalUrl} placeholder="https://…" className="input" />
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
        {field("school_website_url", "Site web de l'école (carte de visite)", "https://www.3is.fr")}
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

/** Texte des CGU et des mentions légales (markdown), affichés sur /cgu et /mentions-legales (public, pas besoin de compte). */
export function LegalTextsForm({ cguBody, mentionsBody, privacyBody }: { cguBody: string; mentionsBody: string; privacyBody: string }) {
  const [state, action, pending] = useActionState(saveSettings, undefined);
  return (
    <form action={action} className="space-y-5">
      <MarkdownField name="cgu_body" defaultValue={cguBody} rows={10} label="CGU" placeholder="Conditions générales d'utilisation…" />
      <MarkdownField name="mentions_legales_body" defaultValue={mentionsBody} rows={10} label="Mentions légales" placeholder="Éditeur, hébergeur…" />
      <MarkdownField name="politique_confidentialite_body" defaultValue={privacyBody} rows={10} label="Politique de confidentialité" placeholder="Données collectées, finalités, durée de conservation…" />
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
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

export function RequestNoteForm({ defaultValue }: { defaultValue: string }) {
  const [state, action, pending] = useActionState(saveRequestNote, undefined);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="note">Ton message pour l&apos;administrateur</label>
        <textarea id="note" name="note" rows={4} maxLength={500} defaultValue={defaultValue} className="input" placeholder="Qui es-tu ? Pourquoi demandes-tu l'accès ? (ex. intervenant, ancien élève, membre du BDE…)" />
      </div>
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Envoi…" : "Enregistrer le message"}</button>
    </form>
  );
}
