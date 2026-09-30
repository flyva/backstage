"use client";

import { useActionState, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Trash2 } from "lucide-react";
import type { FormState } from "@/lib/actions";
import { Toggle } from "@/components/Toggle";
import { LINK_KINDS, type LinkKind } from "@/db/schema";
import { LINK_LABEL, initialsOf } from "@/lib/people-shared";
import {
  addLink, deleteLink, regenerateCardSlug, removeAvatar, saveFiche, saveNetworkContact, saveTrack, setCardEnabled, uploadAvatar,
  deleteNetworkContact, deleteTrack, setFeedEnabled, regenerateFeedToken,
} from "@/lib/people-actions";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400" role="status">{state.ok}</p>;
  return null;
}

export function Avatar({ name, url, size = 48 }: { name: string; url: string | null; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (url) return <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-accent font-bold text-accent-fg" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden>
      {initialsOf(name)}
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

// ---------- Fiche ----------

export function FicheForm(props: {
  tracks: { id: number; name: string }[]; trackId: number | null; headline: string; phone: string; contactEmail: string;
  showInDirectory: boolean; showPhone: boolean; cardShowPhone: boolean; discord: string; cardShowDiscord: boolean; cardShowSchool: boolean; showCompany: boolean; companyName: string; loginEmail: string;
}) {
  const [state, action, pending] = useActionState(saveFiche, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="trackId">Filière</label>
          <select id="trackId" name="trackId" defaultValue={props.trackId ?? ""} className="input">
            <option value="">Non renseignée</option>
            {props.tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="headline">Présentation courte</label>
          <input id="headline" name="headline" defaultValue={props.headline} maxLength={120} placeholder="Régisseur son · alternant chez…" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="phone">Téléphone (facultatif)</label>
          <input id="phone" name="phone" defaultValue={props.phone} maxLength={30} inputMode="tel" autoComplete="tel" placeholder="06 12 34 56 78" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="contactEmail">E-mail de contact (carte de visite)</label>
          <input id="contactEmail" name="contactEmail" type="email" defaultValue={props.contactEmail} maxLength={190} placeholder="Facultatif : sinon ton adresse 3IS" className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="discord">Pseudo Discord (facultatif)</label>
        <input id="discord" name="discord" defaultValue={props.discord} maxLength={40} autoComplete="off" placeholder="ton_pseudo" className="input sm:max-w-xs" />
        <p className="mt-1 text-xs text-muted">Sans le @. Il apparaît dans l&apos;annuaire de la promo ; un interrupteur ci-dessous décide s&apos;il figure aussi sur ta carte de visite publique.</p>
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-semibold">Dans l&apos;annuaire de la promo</legend>
        <Toggle name="showInDirectory" defaultChecked={props.showInDirectory} title="Apparaître dans l'annuaire" hint="Réservé aux personnes connectées à Backstage. Sans ça, tu n'as pas de fiche visible." />
        <Toggle name="showPhone" defaultChecked={props.showPhone} title="Afficher mon téléphone" />
        <Toggle
          name="showCompany" defaultChecked={props.showCompany} title="Afficher mon entreprise d'alternance"
          hint={props.companyName ? <>Seul le nom est montré : « {props.companyName} ». L&apos;adresse reste privée.</> : "Renseigne d'abord « Entreprise d'alternance » dans les informations de ton profil, plus haut."}
        />
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-semibold">Sur ma carte de visite publique</legend>
        <Toggle name="cardShowPhone" defaultChecked={props.cardShowPhone} title="Afficher mon téléphone" />
        <Toggle name="cardShowDiscord" defaultChecked={props.cardShowDiscord} title="Afficher mon Discord" hint="Il figure toujours dans l'annuaire : cette case ne concerne que la carte partageable." />
        <Toggle name="cardShowSchool" defaultChecked={props.cardShowSchool} title="Afficher l'école (3iS Bègles)" hint="Un bouton vers le site de l'école sur ta carte." />
      </fieldset>
      <p className="text-xs text-muted">
        L&apos;annuaire montre ton adresse <strong className="text-fg">{props.loginEmail}</strong> seulement si elle se termine par @3is.fr. Il est réservé aux personnes connectées à Backstage.
      </p>
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer ma fiche"}</button>
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
          {qrSvg && <div className="size-36 shrink-0 rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: qrSvg }} aria-label="QR code de ma carte" role="img" />}
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

export function TrackForm({ track }: { track?: { id: number; name: string; sortOrder: number } }) {
  const [state, action, pending] = useActionState(saveTrack, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      {track && <input type="hidden" name="id" value={track.id} />}
      <input name="name" required maxLength={80} defaultValue={track?.name} placeholder="Nom de la filière" className="input min-w-56 flex-1" aria-label="Nom de la filière" />
      {track && <input name="sortOrder" type="number" min={0} max={999} defaultValue={track.sortOrder} className="input w-20" aria-label="Ordre d'affichage" title="Ordre d'affichage" />}
      <button className="btn" disabled={pending}>{track ? "Enregistrer" : "Ajouter"}</button>
      {track && (
        <button formAction={deleteTrack} className="btn-ghost" onClick={(e) => { if (!confirm(`Supprimer la filière « ${track.name} » ? Les personnes concernées n'auront plus de filière.`)) e.preventDefault(); }}>
          <Trash2 size={15} /> Supprimer
        </button>
      )}
      <div className="w-full"><Feedback state={state} /></div>
    </form>
  );
}
