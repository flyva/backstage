"use client";

import { useActionState, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Trash2 } from "lucide-react";
import type { FormState } from "@/lib/actions";
import { Toggle } from "@/components/Toggle";
import { LINK_KINDS, type LinkKind } from "@/db/schema";
import { LINK_LABEL, initialsOf } from "@/lib/people-shared";
import {
  addTrackReferentsBulk, addLink, addUserFormation, deleteLink, deleteMyAccount, regenerateCardSlug, removeAvatar, removeUserFormation, saveAnnuaire, saveCardVisibility, saveCompanyProfile, saveDomaine, saveNetworkContact, saveTrack, setCardEnabled, setPromotionByEntryYear, uploadAvatar,
  deleteDomaine, deleteNetworkContact, deleteTrack, setFeedEnabled, regenerateFeedToken,
} from "@/lib/people-actions";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400" role="status">{state.ok}</p>;
  return null;
}

export function Avatar({ name, url, size = 48, online }: { name: string; url: string | null; size?: number; online?: boolean }) {
  const dot = online && (
    <span
      className="absolute rounded-full bg-[#28a745] ring-2 ring-surface"
      style={{ width: Math.max(8, size * 0.28), height: Math.max(8, size * 0.28), right: 0, bottom: 0 }}
      aria-label="En ligne"
      title="En ligne"
    />
  );
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />
      ) : (
        <span className="grid place-items-center rounded-full bg-accent font-bold text-accent-fg" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden>
          {initialsOf(name)}
        </span>
      )}
      {dot}
    </span>
  );
}

// ---------- Photo ----------

/** Recadre au carré et réduit à 256 px en JPEG avant l'envoi : léger pour le Pi, et aucune donnée de localisation (EXIF) conservée. */
async function squareJpeg(file: File): Promise<File> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(bmp.width, bmp.height);
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  c.getContext("2d")!.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, 256, 256);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.85));
  if (!blob) throw new Error("Image illisible");
  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}

export function AvatarForm({ name, url }: { name: string; url: string | null }) {
  const [state, action, pending] = useActionState(uploadAvatar, undefined);
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [err, setErr] = useState("");
  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setErr("");
    if (!f) return;
    try {
      const small = await squareJpeg(f);
      const dt = new DataTransfer();
      dt.items.add(small);
      if (input.current) input.current.files = dt.files;
      setPreview(URL.createObjectURL(small));
    } catch {
      setPreview(null);
      if (input.current) input.current.value = "";
      setErr("Image illisible : essaie un fichier JPEG, PNG ou WebP.");
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar name={name} url={preview ?? url} size={80} />
      <div className="min-w-0 flex-1 space-y-2">
        <form action={action} className="flex flex-wrap items-center gap-2">
          <input ref={input} type="file" name="avatar" accept="image/jpeg,image/png,image/webp" onChange={onPick} className="input max-w-xs text-sm" aria-label="Choisir une photo" />
          <button className="btn" disabled={pending || !preview}>{pending ? "Envoi…" : "Enregistrer la photo"}</button>
        </form>
        {url && (
          <form action={removeAvatar}><button className="text-xs text-muted underline">Retirer ma photo</button></form>
        )}
        {err && <p className="text-sm text-danger" role="alert">{err}</p>}
        <Feedback state={state} />
        <p className="text-xs text-muted">La photo est recadrée en carré. Elle apparaît dans l&apos;annuaire, le menu et ta carte de visite.</p>
      </div>
    </div>
  );
}

// ---------- Profil d'un compte « Entreprise » (lecture seule) ----------

export function CompanyProfileForm({ firstName, lastName, companyName, headline }: { firstName: string; lastName: string; companyName: string; headline: string }) {
  const [state, action, pending] = useActionState(saveCompanyProfile, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="cp-fn">Prénom</label><input id="cp-fn" name="firstName" defaultValue={firstName} maxLength={60} required className="input" /></div>
        <div><label className="label" htmlFor="cp-ln">Nom</label><input id="cp-ln" name="lastName" defaultValue={lastName} maxLength={60} required className="input" /></div>
      </div>
      <div>
        <label className="label" htmlFor="cp-company">Entreprise</label>
        <input id="cp-company" name="companyName" defaultValue={companyName} maxLength={120} placeholder="Nom de l'entreprise" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="cp-headline">Poste</label>
        <input id="cp-headline" name="headline" defaultValue={headline} maxLength={120} placeholder="Tuteur, responsable technique…" className="input" />
      </div>
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
    </form>
  );
}

// ---------- Fiche ----------

// Repris du fonctionnement et de l'ordre de BDE (ProfilClient.tsx > TabAnnuaire) : une note d'intro, une liste de
// réglages d'affichage (le premier en gras avec sa précision, les suivants simples), puis Enregistrer. Les réglages
// sans équivalent BDE (entreprise d'alternance) sont ajoutés à la suite, pas mélangés. Habilitation électrique retirée.
export function AnnuaireForm(props: {
  tracks: { id: number; name: string }[]; trackId: number | null;
  classes: { id: number; name: string }[]; classId: number | null;
  headline: string; phone: string; contactEmail: string;
  showInDirectory: boolean; showPhone: boolean; discord: string; showDiscord: boolean; showClass: boolean; showStatus: boolean;
  showCompany: boolean; companyName: string; loginEmail: string;
}) {
  const [state, action, pending] = useActionState(saveAnnuaire, undefined);
  return (
    <form action={action} className="space-y-4">
      {/* trackId/classId : gérés dans l'onglet « Ma promo » ; phone/discord dans l'onglet Profil > Coordonnées.
          Reportés ici en champs cachés pour ne pas être effacés par cet envoi. */}
      <input type="hidden" name="trackId" value={props.trackId ?? ""} />
      <input type="hidden" name="classId" value={props.classId ?? ""} />
      <input type="hidden" name="phone" value={props.phone} />
      <input type="hidden" name="discord" value={props.discord} />
      <p className="text-sm text-muted">Choisis ce que les autres personnes de la promo voient de toi dans l&apos;annuaire.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="headline">Présentation courte</label>
          <input id="headline" name="headline" defaultValue={props.headline} maxLength={120} placeholder="Régisseur son · alternant chez…" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="contactEmail">E-mail de contact (carte de visite)</label>
          <input id="contactEmail" name="contactEmail" type="email" defaultValue={props.contactEmail} maxLength={190} placeholder="Facultatif : sinon ton adresse 3IS" className="input" />
        </div>
      </div>
      <fieldset className="divide-y divide-line border-y border-line">
        <AnnuaireToggleRow name="showInDirectory" defaultChecked={props.showInDirectory} label="Apparaître dans l'annuaire" desc="Si désactivé, les autres champs ci-dessous n'ont plus d'effet." bold />
        <AnnuaireToggleRow name="showPhone" defaultChecked={props.showPhone} label="Afficher mon téléphone" />
        <AnnuaireToggleRow name="showDiscord" defaultChecked={props.showDiscord} label="Afficher mon Discord" />
        <AnnuaireToggleRow name="showClass" defaultChecked={props.showClass} label="Afficher ma filière et ma promo" />
        <AnnuaireToggleRow name="showStatus" defaultChecked={props.showStatus} label="Afficher mon statut (alternant/initial)" />
        <AnnuaireToggleRow
          name="showCompany" defaultChecked={props.showCompany} label="Afficher mon entreprise d'alternance"
          desc={props.companyName ? `Seul le nom est montré : « ${props.companyName} ». L'adresse reste privée.` : "Renseigne d'abord « Entreprise d'alternance » dans Coordonnées."}
        />
      </fieldset>
      <p className="text-xs text-muted">
        L&apos;annuaire montre ton adresse <strong className="text-fg">{props.loginEmail}</strong> seulement si elle se termine par @3is.fr. Il est réservé aux personnes connectées à Backstage.
      </p>
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer ma fiche"}</button>
    </form>
  );
}

// Ligne de réglage avec séparateur, reprise de BDE : titre (en gras pour le premier) + précision à gauche, interrupteur à droite.
function AnnuaireToggleRow({ name, defaultChecked, label, desc, bold }: { name: string; defaultChecked: boolean; label: string; desc?: string; bold?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-2.5">
      <span className="min-w-0">
        <span className={`block text-sm ${bold ? "font-bold" : ""}`}>{label}</span>
        {desc && <span className="mt-0.5 block text-xs text-muted">{desc}</span>}
      </span>
      <span className="relative inline-flex h-6 w-11 shrink-0">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
        <span className="absolute inset-0 rounded-full bg-line ring-1 ring-inset ring-line transition peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/60" />
        <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-surface shadow ring-1 ring-line transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function CardVisibilityForm({ cardShowPhone, cardShowDiscord, cardShowSchool }: { cardShowPhone: boolean; cardShowDiscord: boolean; cardShowSchool: boolean }) {
  const [state, action, pending] = useActionState(saveCardVisibility, undefined);
  return (
    <form action={action} className="space-y-3">
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-semibold">Sur ma carte de visite publique</legend>
        <Toggle name="cardShowPhone" defaultChecked={cardShowPhone} title="Afficher mon téléphone" />
        <Toggle name="cardShowDiscord" defaultChecked={cardShowDiscord} title="Afficher mon Discord" hint="Il figure toujours dans l'annuaire : cette case ne concerne que la carte partageable." />
        <Toggle name="cardShowSchool" defaultChecked={cardShowSchool} title="Afficher l'école (3iS Bègles)" hint="Un bouton vers le site de l'école sur ta carte." />
      </fieldset>
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
    </form>
  );
}

// ---------- Liens ----------

export function LinksEditor({ links }: { links: { id: number; kind: LinkKind; url: string; label: string | null }[] }) {
  const [state, action, pending] = useActionState(addLink, undefined);
  const form = useRef<HTMLFormElement>(null);
  return (
    <div className="space-y-4">
      {links.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line text-sm">
          {links.map((l) => (
            <li key={l.id} className="flex items-center gap-3 px-3 py-2">
              <span className="w-24 shrink-0 text-xs font-semibold text-muted">{LINK_LABEL[l.kind]}</span>
              <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="min-w-0 flex-1 truncate underline">{l.label || l.url}</a>
              <form action={deleteLink}>
                <input type="hidden" name="id" value={l.id} />
                <button className="text-muted hover:text-danger" aria-label={`Supprimer le lien ${LINK_LABEL[l.kind]}`}><Trash2 size={16} /></button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form ref={form} action={async (fd) => { await action(fd); form.current?.reset(); }} className="grid gap-3 sm:grid-cols-[9rem_1fr_auto]">
        <select name="kind" defaultValue="linkedin" className="input" aria-label="Type de lien">
          {LINK_KINDS.map((k) => <option key={k} value={k}>{LINK_LABEL[k]}</option>)}
        </select>
        <input name="url" required maxLength={300} placeholder="Colle le lien complet (https://…)" className="input" aria-label="Adresse du lien" />
        <button className="btn" disabled={pending}>Ajouter</button>
        <input name="label" maxLength={60} placeholder="Texte affiché (facultatif)" className="input sm:col-span-3" aria-label="Texte affiché" />
      </form>
      <Feedback state={state} />
    </div>
  );
}

// ---------- Carte de visite ----------

/** Petite pastille qui copie un texte au clic (Discord n'a pas de lien direct par pseudo). */
export function CopyChip({ value, prefix, className = "" }: { value: string; prefix?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      title="Copier le pseudo"
      className={`inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-xs hover:bg-bg ${className}`}
      onClick={async () => { try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* presse-papiers indisponible */ } }}
    >
      {done ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
      <span>{done ? "Copié" : <>{prefix}<strong className="font-semibold">{value}</strong></>}</span>
    </button>
  );
}

export function CopyButton({ value, label = "Copier le lien" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn-ghost" onClick={async () => { try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1800); } catch { /* presse-papiers indisponible */ } }}>
      {done ? <Check size={15} /> : <Copy size={15} />} {done ? "Copié" : label}
    </button>
  );
}

export function CardPanel({ enabled, url, qrSvg }: { enabled: boolean; url: string | null; qrSvg: string | null }) {
  return (
    <div className="space-y-4">
      <form action={setCardEnabled} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="enabled" value={enabled ? "0" : "1"} />
        <button className={enabled ? "btn-ghost" : "btn"}>{enabled ? "Désactiver ma carte" : "Activer ma carte de visite"}</button>
        <span className="text-sm text-muted">{enabled ? "Ta carte est en ligne : toute personne qui a le lien peut la voir, sans compte." : "Ta carte n'est visible par personne."}</span>
      </form>
      {enabled && url && (
        <div className="flex flex-wrap items-start gap-5">
          {qrSvg && <div className="size-24 shrink-0 rounded-xl bg-white p-1.5" dangerouslySetInnerHTML={{ __html: qrSvg }} aria-label="QR code de ma carte" role="img" />}
          <div className="min-w-0 flex-1 space-y-3">
            <p className="break-all rounded-lg border border-line bg-bg px-3 py-2 text-sm">{url}</p>
            <div className="flex flex-wrap gap-2">
              <CopyButton value={url} />
              <a href={url} target="_blank" rel="noopener noreferrer" className="btn-ghost"><ExternalLink size={15} /> Voir ma carte</a>
              <form action={regenerateCardSlug}><button className="btn-ghost" title="L'ancien lien ne fonctionnera plus">Changer l&apos;adresse</button></form>
            </div>
            <p className="text-xs text-muted">La carte montre ton nom, ta photo, ta filière, ta présentation, tes liens, ton e-mail de contact (ou 3IS) et ton téléphone si tu l&apos;as autorisé.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Abonnement calendrier ----------

export function FeedPanel({ enabled, httpsUrl }: { enabled: boolean; httpsUrl: string | null }) {
  const webcal = httpsUrl ? httpsUrl.replace(/^https?:/, "webcal:") : null;
  return (
    <div className="space-y-4">
      <form action={setFeedEnabled} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="enabled" value={enabled ? "0" : "1"} />
        <button className={enabled ? "btn-ghost" : "btn"}>{enabled ? "Désactiver l'abonnement" : "Activer l'abonnement calendrier"}</button>
        <span className="text-sm text-muted">Ton planning école/entreprise, tes échéances, tes évènements BDE et tes retours de matériel dans Google Agenda, Apple Calendrier ou Outlook.</span>
      </form>
      {enabled && httpsUrl && (
        <div className="space-y-3">
          <p className="break-all rounded-lg border border-line bg-bg px-3 py-2 text-sm">{httpsUrl}</p>
          <div className="flex flex-wrap gap-2">
            <CopyButton value={httpsUrl} label="Copier l'adresse" />
            {webcal && <a href={webcal} className="btn-ghost">Ouvrir dans mon calendrier</a>}
            <form action={regenerateFeedToken}><button className="btn-ghost" title="L'ancienne adresse ne fonctionnera plus">Changer l&apos;adresse</button></form>
          </div>
          <p className="text-xs text-muted">Colle cette adresse dans « Ajouter un calendrier par URL » (Google Agenda : Autres agendas → À partir de l&apos;URL). Ne la partage pas : elle donne accès à ton planning, et quiconque l&apos;a peut le lire. Elle se met à jour toutes les heures environ.</p>
        </div>
      )}
    </div>
  );
}

// ---------- Carnet de réseau ----------

export type NetContact = { id: number; name: string; jobTitle: string | null; company: string | null; email: string | null; phone: string | null; linkUrl: string | null; notes: string | null };

export function NetworkContactForm({ contact, onDone }: { contact?: NetContact; onDone?: () => void }) {
  const [state, action, pending] = useActionState(async (prev: FormState, fd: FormData) => {
    const r = await saveNetworkContact(prev, fd);
    if (r?.ok) onDone?.();
    return r;
  }, undefined);
  const c = contact;
  return (
    <form action={action} className="space-y-3">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" required maxLength={120} defaultValue={c?.name} placeholder="Nom et prénom *" className="input" aria-label="Nom" />
        <input name="jobTitle" maxLength={120} defaultValue={c?.jobTitle ?? ""} placeholder="Poste (régisseur général, chargé de prod…)" className="input" aria-label="Poste" />
        <input name="company" maxLength={120} defaultValue={c?.company ?? ""} placeholder="Entreprise ou structure" className="input" aria-label="Entreprise" />
        <input name="email" type="email" maxLength={190} defaultValue={c?.email ?? ""} placeholder="E-mail" className="input" aria-label="E-mail" />
        <input name="phone" maxLength={30} inputMode="tel" defaultValue={c?.phone ?? ""} placeholder="Téléphone" className="input" aria-label="Téléphone" />
        <input name="linkUrl" maxLength={300} defaultValue={c?.linkUrl ?? ""} placeholder="LinkedIn ou site (lien)" className="input" aria-label="Lien" />
      </div>
      <textarea name="notes" rows={3} maxLength={2000} defaultValue={c?.notes ?? ""} placeholder="Notes (où vous vous êtes rencontrés, sujets évoqués…)" className="input" aria-label="Notes" />
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : c ? "Enregistrer" : "Ajouter au carnet"}</button>
    </form>
  );
}

export function NetworkBook({ contacts }: { contacts: NetContact[] }) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const needle = q.trim().toLowerCase();
  const shown = needle ? contacts.filter((c) => [c.name, c.jobTitle, c.company, c.email, c.notes].some((v) => v?.toLowerCase().includes(needle))) : contacts;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (nom, entreprise, notes…)" className="input max-w-sm flex-1" aria-label="Rechercher dans le carnet" />
        <button className="btn" onClick={() => setAdding((a) => !a)}>{adding ? "Fermer" : "Ajouter un contact"}</button>
      </div>
      {adding && <div className="card"><NetworkContactForm onDone={() => setAdding(false)} /></div>}
      {shown.length === 0 && <p className="text-sm text-muted">{contacts.length === 0 ? "Ton carnet est vide : ajoute les personnes que tu rencontres (tuteur, régisseurs, intervenants, recruteurs…)." : "Aucun contact ne correspond."}</p>}
      <ul className="grid gap-3 md:grid-cols-2">
        {shown.map((c) => (
          <li key={c.id} className="card space-y-2 p-4">
            {editing === c.id ? (
              <NetworkContactForm contact={c} onDone={() => setEditing(null)} />
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{c.name}</div>
                    <div className="truncate text-sm text-muted">{[c.jobTitle, c.company].filter(Boolean).join(" · ")}</div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button className="text-sm underline" onClick={() => setEditing(c.id)}>Modifier</button>
                    <form action={deleteNetworkContact} onSubmit={(e) => { if (!confirm(`Supprimer ${c.name} du carnet ?`)) e.preventDefault(); }}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="text-muted hover:text-danger" aria-label={`Supprimer ${c.name}`}><Trash2 size={16} /></button>
                    </form>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {c.email && <a href={`mailto:${c.email}`} className="underline">{c.email}</a>}
                  {c.phone && <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="underline">{c.phone}</a>}
                  {c.linkUrl && <a href={c.linkUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline">Profil / site</a>}
                </div>
                {c.notes && <p className="whitespace-pre-line text-sm text-muted">{c.notes}</p>}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Filières (administration) ----------

type TrackRow = { id: number; name: string; shortName: string | null; domaineId: number | null; yearsCount: number; sortOrder: number };

const TRACK_ROW_COLS = "minmax(10rem,1.4fr) 6rem 9rem 5.5rem 7.5rem";

// Tableau de données accessible (divs + rôles ARIA, pas de <table>/<tr> : un <form> ne peut pas être enfant direct
// d'une ligne de tableau) — une ligne = un vrai <form> avec son propre bouton Enregistrer, plus lisible que des
// champs numériques juxtaposés sans étiquette.
function TrackRowForm({ track, domaines }: { track: TrackRow; domaines: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState(saveTrack, undefined);
  return (
    <form
      action={action} role="row"
      className="grid items-center gap-2 border-b border-line py-2"
      style={{ gridTemplateColumns: TRACK_ROW_COLS }}
    >
      <input type="hidden" name="id" value={track.id} />
      <input type="hidden" name="sortOrder" value={track.sortOrder} />
      <div role="cell"><input name="name" required maxLength={80} defaultValue={track.name} placeholder="Nom de formation entière" className="input" aria-label="Nom de formation entière" /></div>
      <div role="cell"><input name="shortName" maxLength={20} defaultValue={track.shortName ?? ""} placeholder="Ex. RT" className="input" aria-label="Diminutif" /></div>
      <div role="cell">
        <select name="domaineId" defaultValue={track.domaineId ?? ""} className="input" aria-label="Domaine">
          <option value="">Sans domaine</option>
          {domaines.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <div role="cell"><input name="yearsCount" type="number" min={1} max={10} defaultValue={track.yearsCount} className="input" aria-label="Nombre d'années" /></div>
      <div role="cell" className="flex items-center gap-2">
        <button className="btn-ghost text-xs" disabled={pending}>{pending ? "…" : "Enregistrer"}</button>
        <button
          formAction={deleteTrack} className="text-muted hover:text-danger"
          aria-label={`Supprimer ${track.name}`}
          onClick={(e) => { if (!confirm(`Supprimer la formation « ${track.name} » ? Les personnes concernées n'auront plus cette formation.`)) e.preventDefault(); }}
        >
          <Trash2 size={15} />
        </button>
      </div>
      {state?.error && <p role="alert" className="col-span-full text-xs text-danger">{state.error}</p>}
      {state?.ok && <p role="status" className="col-span-full text-xs text-green-600 dark:text-green-400">{state.ok}</p>}
    </form>
  );
}

export function TracksTable({ tracks, domaines }: { tracks: TrackRow[]; domaines: { id: number; name: string }[] }) {
  return (
    <div role="table" aria-label="Formations" className="overflow-x-auto text-sm">
      <div role="row" className="grid gap-2 border-b border-line pb-2 text-left text-xs font-medium uppercase text-muted" style={{ gridTemplateColumns: TRACK_ROW_COLS }}>
        <div role="columnheader">Nom entier</div>
        <div role="columnheader">Diminutif</div>
        <div role="columnheader">Domaine</div>
        <div role="columnheader">Années</div>
        <div role="columnheader">Actions</div>
      </div>
      {tracks.map((t) => <TrackRowForm key={t.id} track={t} domaines={domaines} />)}
      {tracks.length === 0 && <p className="py-3 text-sm text-muted">Aucune formation pour le moment.</p>}
    </div>
  );
}

export function TrackForm({ track, domaines }: { track?: TrackRow; domaines: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState(saveTrack, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      {track && <input type="hidden" name="id" value={track.id} />}
      <div className="sm:col-span-2">
        <label className="label" htmlFor="track-name">Nom de formation entière</label>
        <input id="track-name" name="name" required maxLength={80} defaultValue={track?.name} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="track-short">Diminutif (ex. RT)</label>
        <input id="track-short" name="shortName" maxLength={20} defaultValue={track?.shortName ?? ""} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="track-domaine">Domaine</label>
        <select id="track-domaine" name="domaineId" defaultValue={track?.domaineId ?? ""} className="input">
          <option value="">Sans domaine</option>
          {domaines.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="track-years">Nombre d&apos;années</label>
        <input id="track-years" name="yearsCount" type="number" min={1} max={10} defaultValue={track?.yearsCount ?? 1} className="input w-24" />
      </div>
      {track && (
        <div>
          <label className="label" htmlFor="track-order">Ordre d&apos;affichage</label>
          <input id="track-order" name="sortOrder" type="number" min={0} max={999} defaultValue={track.sortOrder} className="input w-24" />
        </div>
      )}
      <div className="flex items-center gap-2 sm:col-span-2">
        <button className="btn" disabled={pending}>{track ? "Enregistrer" : "Ajouter"}</button>
        {track && (
          <button formAction={deleteTrack} className="btn-ghost" onClick={(e) => { if (!confirm(`Supprimer la formation « ${track.name} » ? Les personnes concernées n'auront plus cette formation.`)) e.preventDefault(); }}>
            <Trash2 size={15} /> Supprimer
          </button>
        )}
      </div>
      <div className="sm:col-span-2"><Feedback state={state} /></div>
    </form>
  );
}

// ---------- Suppression de compte (RGPD) ----------

export function DeleteMyAccountForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(deleteMyAccount, undefined);
  return (
    <form action={action} className="space-y-2">
      <label className="label" htmlFor="confirmEmail">Retape ton adresse ({email}) pour confirmer</label>
      <input id="confirmEmail" name="confirmEmail" type="email" required autoComplete="off" placeholder={email} className="input" />
      <Feedback state={state} />
      <button
        className="btn border-danger bg-danger text-white hover:opacity-90"
        disabled={pending}
        onClick={(e) => { if (!confirm("Supprimer définitivement ton compte et tes données ? Impossible à annuler.")) e.preventDefault(); }}
      >
        <Trash2 size={15} /> {pending ? "Suppression…" : "Supprimer mon compte"}
      </button>
    </form>
  );
}

// ---------- Domaines (administration) ----------

export function DomaineForm({ domaine }: { domaine?: { id: number; name: string; sortOrder: number } }) {
  const [state, action, pending] = useActionState(saveDomaine, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      {domaine && <input type="hidden" name="id" value={domaine.id} />}
      <input name="name" required maxLength={80} defaultValue={domaine?.name} placeholder="Nom du domaine" className="input min-w-56 flex-1" aria-label="Nom du domaine" />
      {domaine && <input name="sortOrder" type="number" min={0} max={999} defaultValue={domaine.sortOrder} className="input w-20" aria-label="Ordre d'affichage" title="Ordre d'affichage" />}
      <button className="btn" disabled={pending}>{domaine ? "Enregistrer" : "Ajouter"}</button>
      {domaine && (
        <button formAction={deleteDomaine} className="btn-ghost" onClick={(e) => { if (!confirm(`Supprimer le domaine « ${domaine.name} » ? Les formations concernées n'auront plus de domaine.`)) e.preventDefault(); }}>
          <Trash2 size={15} /> Supprimer
        </button>
      )}
      <div className="w-full"><Feedback state={state} /></div>
    </form>
  );
}

// Promotions : plus de page d'administration ni de formulaire manuel — la promo se calcule automatiquement
// depuis l'onglet Ma promo du profil (voir PromotionPicker, année d'entrée + durée de la formation).

// ---------- Ma promo : formations suivies (tags qui s'accumulent) + promotion ----------

type FormationOption = { id: number; name: string; shortName: string | null; yearsCount: number };
type MyFormation = { id: number; trackId: number; year: number; trackName: string; shortName: string | null; createdAt: Date };

function formationTag(f: { trackName: string; shortName: string | null; year: number }) {
  return `${f.shortName || f.trackName}${f.year}`;
}

export function FormationPicker({ tracks, myFormations }: { tracks: FormationOption[]; myFormations: MyFormation[] }) {
  const [state, action, pending] = useActionState(addUserFormation, undefined);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<FormationOption | null>(null);
  const [year, setYear] = useState(1);
  const q = query.trim().toLowerCase();
  const matches = q ? tracks.filter((t) => t.name.toLowerCase().includes(q) || (t.shortName ?? "").toLowerCase().includes(q)).slice(0, 8) : [];
  const sorted = [...myFormations].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="space-y-3">
      {sorted.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {sorted.map((f, i) => (
            <li key={f.id} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${i === 0 ? "bg-accent text-accent-fg" : "border border-line text-muted"}`}>
              {formationTag(f)}
              {i === 0 && <span className="text-xs opacity-75">(actuelle)</span>}
              <form action={removeUserFormation}>
                <input type="hidden" name="id" value={f.id} />
                <button type="submit" aria-label={`Retirer ${formationTag(f)}`} className="opacity-70 hover:opacity-100"><Trash2 size={12} /></button>
              </form>
            </li>
          ))}
        </ul>
      )}
      {sorted.length === 0 && <p className="text-sm text-muted">Aucune formation renseignée pour l&apos;instant.</p>}

      <form action={action} className="flex flex-wrap items-end gap-2">
        <div className="relative min-w-56 flex-1">
          <label className="label" htmlFor="formation-search">Ajouter une formation</label>
          <input
            id="formation-search" autoComplete="off" className="input" placeholder="Nom entier ou diminutif (ex. RT, Régisseur Technique)"
            value={picked ? `${picked.name}${picked.shortName ? ` (${picked.shortName})` : ""}` : query}
            onChange={(e) => { setPicked(null); setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
          />
          {open && matches.length > 0 && !picked && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
              {matches.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-bg"
                    onClick={() => { setPicked(t); setQuery(""); setOpen(false); setYear(1); }}
                  >
                    <span>{t.name}</span>
                    {t.shortName && <span className="text-xs text-muted">{t.shortName}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input type="hidden" name="trackId" value={picked?.id ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="formation-year">Année</label>
          <select id="formation-year" name="year" className="input w-28" value={year} onChange={(e) => setYear(Number(e.target.value))} disabled={!picked}>
            {Array.from({ length: picked?.yearsCount ?? 1 }, (_, i) => i + 1).map((y) => <option key={y} value={y}>{y}{picked && y > picked.yearsCount ? " (indisponible)" : ""}</option>)}
          </select>
        </div>
        <button className="btn" disabled={pending || !picked}>{pending ? "Ajout…" : "Ajouter"}</button>
      </form>
      <Feedback state={state} />
      <p className="text-xs text-muted">La formation la plus récemment ajoutée (en couleur) est celle affichée dans l&apos;annuaire et pour les informations importantes de l&apos;appli.</p>
    </div>
  );
}

// Autocomplétion sur une liste fermée (les 5 années précédentes + l'année en cours) : jamais une année future.
function EntryYearField({ entryYear, disabled }: { entryYear: number | null; disabled: boolean }) {
  const nowYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => nowYear - i); // [nowYear, nowYear-1, …, nowYear-5]
  const [query, setQuery] = useState(entryYear ? String(entryYear) : "");
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<number | null>(entryYear);
  const q = query.trim();
  const matches = q ? years.filter((y) => String(y).includes(q)) : years;

  return (
    <div className="relative w-32">
      <label className="label" htmlFor="entryYear-search">Année d&apos;entrée dans cette formation</label>
      <input
        id="entryYear-search" autoComplete="off" inputMode="numeric" className="input" placeholder={String(nowYear)}
        value={query}
        disabled={disabled}
        onChange={(e) => { setPicked(null); setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          {matches.map((y) => (
            <li key={y}>
              <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-bg" onClick={() => { setPicked(y); setQuery(String(y)); setOpen(false); }}>
                {y}
              </button>
            </li>
          ))}
        </ul>
      )}
      <input type="hidden" name="entryYear" value={picked ?? ""} />
    </div>
  );
}

export function PromotionPicker({ currentName, currentYearsCount, entryYear }: { currentName: string | null; currentYearsCount: number | null; entryYear: number | null }) {
  const [state, action, pending] = useActionState(setPromotionByEntryYear, undefined);
  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <EntryYearField entryYear={entryYear} disabled={!currentYearsCount} />
        <button className="btn" disabled={pending || !currentYearsCount}>{pending ? "…" : "Enregistrer"}</button>
      </div>
      {currentYearsCount ? (
        <p className="text-xs text-muted">
          {currentName} dure {currentYearsCount} année{currentYearsCount > 1 ? "s" : ""} : la fin se calcule automatiquement (ex. entrée en {new Date().getFullYear()} → promo {new Date().getFullYear()}-{new Date().getFullYear() + currentYearsCount - 1}).
        </p>
      ) : (
        <p className="text-xs text-muted">Ajoute d&apos;abord une formation ci-dessus : la durée de la promo en dépend.</p>
      )}
      <Feedback state={state} />
    </form>
  );
}

// ---------- Référents de filière (administration) ----------

export function ReferentAssignForm({ users, tracks }: { users: { id: number; name: string }[]; tracks: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState(addTrackReferentsBulk, undefined);
  const [userId, setUserId] = useState("");
  const [picked, setPicked] = useState<{ id: number; name: string }[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const q = query.trim().toLowerCase();
  const pickedIds = new Set(picked.map((p) => p.id));
  const matches = tracks.filter((t) => !pickedIds.has(t.id) && (!q || t.name.toLowerCase().includes(q))).slice(0, 8);

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="ref-user">Personne</label>
          <select id="ref-user" name="userId" required className="input" value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="" disabled>Choisir…</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="relative">
          <label className="label" htmlFor="ref-tracks">Formations suivies</label>
          {picked.length > 0 && (
            <ul className="mb-1.5 flex flex-wrap gap-1.5">
              {picked.map((p) => (
                <li key={p.id} className="flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-0.5 text-xs">
                  {p.name}
                  <input type="hidden" name="trackIds" value={p.id} />
                  <button type="button" aria-label={`Retirer ${p.name}`} className="text-muted hover:text-danger" onClick={() => setPicked(picked.filter((x) => x.id !== p.id))}>
                    <Trash2 size={11} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input
            id="ref-tracks" autoComplete="off" className="input" placeholder="Rechercher une formation…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
          />
          {open && matches.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
              {matches.map((t) => (
                <li key={t.id}>
                  <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-bg" onClick={() => { setPicked([...picked, t]); setQuery(""); setOpen(false); }}>
                    {t.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-xs text-muted">On ne précise pas d&apos;année : un référent suit toujours « sa » filière.</p>
        </div>
      </div>
      <Feedback state={state} />
      <button className="btn" disabled={pending || picked.length === 0}>{pending ? "Enregistrement…" : "Ajouter comme référent"}</button>
    </form>
  );
}

