"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, EyeOff, RefreshCw, Trash2 } from "lucide-react";
import type { FormState } from "@/lib/actions";
import { anonymizeUser, createUser, deleteRole, deleteUser, resetUserPassword, saveRole, updateUser } from "@/lib/user-admin-actions";
import { saveUserBdeRole } from "@/lib/association-actions";
import { BDE_STATUS_LABEL } from "@/lib/association";
import type { BdeStatus } from "@/db/schema";
import { ADMIN_SECTIONS, LEVEL_LABEL, catalogGrouped, catalogLevelOf, type Level } from "@/lib/perms";
import { TOGGLEABLE_GROUPS } from "@/lib/nav-data";
import { PasswordField } from "@/components/PasswordField";
import { CopyButton } from "@/components/people-forms";

/** Mot de passe lisible (pas de 0/O/1/l ambigus), facile à relire ou recopier à voix haute. */
function randomPassword() {
  const abc = "abcdefghjkmnpqrstuvwxyzACDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => abc[b % abc.length]).join("");
}

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

type RoleValues = { id?: number; name?: string; description?: string; isAdmin?: boolean; permAdministration?: boolean; system?: boolean } & Record<string, unknown>;

/** Groupe de cases à cocher avec un bouton « Tout cocher »/« Tout décocher » : évite de cliquer une par une sur
 *  les pages d'un thème quand on veut juste tout activer ou tout couper. Purement visuel (DOM direct, pas d'état
 *  React) : les cases restent de simples champs non contrôlés, comme le reste du formulaire. */
function CheckAllGroup({ title, children }: { title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const setAll = (checked: boolean) => {
    ref.current?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((cb) => { cb.checked = checked; });
  };
  return (
    <div ref={ref} className="rounded-xl border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="text-sm">{title}</strong>
        <div className="flex gap-2 text-xs">
          <button type="button" onClick={() => setAll(true)} className="text-accent hover:underline">Tout cocher</button>
          <button type="button" onClick={() => setAll(false)} className="text-muted hover:underline">Tout décocher</button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">{children}</div>
    </div>
  );
}

export function RoleForm({ role = {} }: { role?: RoleValues }) {
  const [state, action, pending] = useActionState(saveRole, undefined);
  const [isAdminChecked, setIsAdminChecked] = useState(!!role.isAdmin);
  const [permAdminChecked, setPermAdminChecked] = useState(!!role.permAdministration);
  const k = role.id ?? "new";
  const hiddenAdminSet = typeof role.adminSections === "string" ? new Set(role.adminSections.split(",")) : new Set<string>();
  return (
    <form action={action} className="space-y-5" key={role.id ? `e${role.id}` : state?.ok ? "done" : "new"}>
      {role.id && <input type="hidden" name="id" value={role.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor={`rn${k}`}>Nom du rôle</label><input id={`rn${k}`} name="name" defaultValue={role.name} required minLength={2} maxLength={60} placeholder="Régisseur, Tuteur, Intervenant…" className="input" /></div>
        <div><label className="label" htmlFor={`rd${k}`}>Description (facultatif)</label><input id={`rd${k}`} name="description" defaultValue={role.description} maxLength={200} className="input" /></div>
      </div>

      <fieldset className="space-y-2">
        <legend className="label">Accès complet</legend>
        <label className="flex items-start gap-3 rounded-xl border border-line p-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/5">
          <input type="checkbox" name="isAdmin" defaultChecked={role.isAdmin} disabled={role.system && role.isAdmin} onChange={(e) => setIsAdminChecked(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent)]" />
          <span><strong>Administrateur</strong><span className="block text-xs text-muted">Tous les droits ci-dessous, y compris ceux qu&apos;on ajoutera plus tard. À réserver à peu de personnes.</span></span>
        </label>
        {role.system && role.isAdmin && <input type="hidden" name="isAdmin" value="on" />}
        <label className="flex items-start gap-3 rounded-xl border border-line p-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/5">
          <input type="checkbox" name="isCompany" defaultChecked={!!role.isCompany} disabled={!!role.isAdmin} className="mt-0.5 size-4 accent-[var(--accent)]" />
          <span><strong>Entreprise (lecture seule)</strong><span className="block text-xs text-muted">Aucune modification possible nulle part : accès uniquement à l&apos;Agenda, au Planning des personnes qui l&apos;ont désigné comme référent, et aux Contacts de l&apos;école. Ignore tous les réglages ci-dessous.</span></span>
        </label>
      </fieldset>

      {/* Un seul contrôle (Aucun/Voir/Gérer) pour tous les domaines, groupés par rubrique — même principe que le
          formulaire de rôle d'OASIS (_form.html.twig) : plus de présentation différente selon la catégorie de droit. */}
      {catalogGrouped().map(({ section, areas }) => (
        <fieldset key={section} className="space-y-2">
          <legend className="label">{section}</legend>
          {section === "Secteurs" && (
            <p className="text-xs text-muted">
              <strong>Aucun</strong> (invisible), <strong>Voir</strong> (juste observer, aucune modification possible) ou{" "}
              <strong>Gérer</strong> (administration complète de ce secteur).
            </p>
          )}
          {section === "Sections du menu" && (
            <p className="text-xs text-muted">« Aucun » retire toute la section du menu pour ce rôle (utile pour un accès externe réduit à l&apos;essentiel). L&apos;assistant en bas à droite reste toujours disponible.</p>
          )}
          <div className="space-y-2">
            {areas.map((area) => {
              const cur = catalogLevelOf(role, area);
              const levels: Level[] = ["none", ...(area.hasView ? (["view"] as const) : []), ...(area.hasManage ? (["manage"] as const) : [])];
              return (
                <div key={area.key} className="rounded-xl border border-line p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-sm">{area.label}</strong>
                    <div role="radiogroup" aria-label={area.label} className="flex overflow-hidden rounded-lg border border-line text-sm">
                      {levels.map((lv) => (
                        <label key={lv} className="cursor-pointer border-l border-line px-3 py-1 first:border-l-0 has-[:checked]:bg-accent has-[:checked]:text-accent-fg">
                          <input
                            type="radio" name={area.fieldName} value={lv}
                            defaultChecked={role.id ? cur === lv : lv === (area.hasManage && !area.hasView ? "none" : "view")}
                            onChange={area.key === "administration" ? (e) => setPermAdminChecked(e.target.value === "manage") : undefined}
                            className="sr-only"
                          />
                          {LEVEL_LABEL[lv]}
                        </label>
                      ))}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted">{area.hint}</p>
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}

      {(isAdminChecked || permAdminChecked) && (
        <fieldset className="space-y-2 rounded-xl border border-accent/40 bg-accent/5 p-3">
          <legend className="label px-1">Catégories d&apos;administration</legend>
          <p className="text-xs text-muted">Si ce rôle n&apos;est pas administrateur complet, choisis les catégories du tableau de bord Administration qu&apos;il voit (ex. juste « Comptes »). Tout coché par défaut.</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {ADMIN_SECTIONS.map((s) => (
              <label key={s.key} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name={`admin_section_${s.key}`} defaultChecked={!role.id || !hiddenAdminSet.has(s.key)} disabled={isAdminChecked} className="size-4 accent-[var(--accent)]" />
                {s.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <details className="group rounded-xl border border-line p-3">
        <summary className="cursor-pointer list-none font-semibold marker:hidden">
          <span className="inline-block transition-transform group-open:rotate-90">▸</span> Pages du menu (réglage fin, facultatif)
        </summary>
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted">Décoche une page précise pour la retirer du menu de ce rôle, sans toucher aux autres (ex. accès à Alternance mais pas à la Pointeuse). Les domaines avec un niveau Voir/Gérer ci-dessus se règlent plus haut, pas ici.</p>
          {TOGGLEABLE_GROUPS.map((g) => {
            const hiddenSet = typeof role.hiddenPages === "string" ? new Set(role.hiddenPages.split(",")) : new Set<string>();
            return (
              <CheckAllGroup key={g.id} title={g.title}>
                {g.pages.map((pg) => (
                  <label key={pg.href} className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" name={`page_${pg.href}`} defaultChecked={!role.id || !hiddenSet.has(pg.href)} className="size-4 accent-[var(--accent)]" />
                    {pg.label}
                  </label>
                ))}
              </CheckAllGroup>
            );
          })}
        </div>
      </details>

      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : role.id ? "Enregistrer le rôle" : "Créer le rôle"}</button>
    </form>
  );
}

export function DeleteRoleForm({ id }: { id: number }) {
  const [state, action, pending] = useActionState(deleteRole, undefined);
  return (
    <form action={action} onSubmit={(e) => { if (!confirm("Supprimer ce rôle ?")) e.preventDefault(); }} className="space-y-1">
      <input type="hidden" name="id" value={id} />
      <button className="flex items-center gap-1 text-xs text-muted hover:text-danger" disabled={pending}><Trash2 size={14} /> Supprimer le rôle</button>
      <Feedback state={state} />
    </form>
  );
}

/**
 * Création d'un compte natif (mot de passe, pas Google/Microsoft) : pour les personnes sans adresse 3iS ni Gmail,
 * typiquement un tuteur en entreprise. Deux modes :
 * - « invite » : un lien d'activation (choix du mot de passe, puis CGU) part par mail.
 * - « direct » : pas de mail, identifiants (mot de passe aléatoire ou choisi ici) donnés tout de suite à l'admin,
 *   CGU déjà acceptées — pratique pour donner l'accès à l'entreprise sans qu'elle ait à créer quoi que ce soit.
 * « Référent de » rattache directement ce compte au planning/pointeuse/agenda des alternants choisis (lecture seule).
 */
export function CreateUserForm({ roles, alternants }: { roles: { id: number; name: string; isCompany: boolean }[]; alternants: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState(createUser, undefined);
  const [mode, setMode] = useState<"invite" | "direct">("invite");
  const [password, setPassword] = useState(() => randomPassword());
  const [roleId, setRoleId] = useState("");
  const isCompanyRole = roles.some((r) => String(r.id) === roleId && r.isCompany);
  return (
    <form action={action} className="space-y-4" key={state?.ok ? "done" : "form"}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="nu-fn">Prénom</label><input id="nu-fn" name="firstName" required maxLength={60} className="input" /></div>
        <div><label className="label" htmlFor="nu-ln">Nom</label><input id="nu-ln" name="lastName" required maxLength={60} className="input" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="nu-em">Adresse e-mail (sert d&apos;identifiant)</label><input id="nu-em" name="email" type="email" required maxLength={190} className="input" /></div>
        <div>
          <label className="label" htmlFor="nu-role">Rôle</label>
          <select id="nu-role" name="roleId" value={roleId} onChange={(e) => setRoleId(e.target.value)} required className="input">
            <option value="" disabled>Choisir…</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      </div>

      {isCompanyRole && (
        <div className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="nu-company">Entreprise</label><input id="nu-company" name="companyName" maxLength={120} placeholder="Nom de l'entreprise" className="input" /></div>
          <div><label className="label" htmlFor="nu-headline">Poste</label><input id="nu-headline" name="headline" maxLength={120} placeholder="Tuteur, responsable technique…" className="input" /></div>
          <p className="text-xs text-muted sm:col-span-2">Affichés sur le profil du compte (lui évite d&apos;avoir à les ressaisir).</p>
        </div>
      )}

      <fieldset className="space-y-2">
        <legend className="label">Mise en place du compte</legend>
        <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
          <label className={`cursor-pointer rounded-xl border p-3 text-sm ${mode === "invite" ? "border-accent bg-accent/5" : "border-line"}`}>
            <input type="radio" name="modeRadio" checked={mode === "invite"} onChange={() => setMode("invite")} className="sr-only" />
            <strong>Lien par mail</strong>
            <span className="mt-0.5 block text-xs text-muted">La personne reçoit un mail, choisit elle-même son mot de passe et accepte les CGU.</span>
          </label>
          <label className={`cursor-pointer rounded-xl border p-3 text-sm ${mode === "direct" ? "border-accent bg-accent/5" : "border-line"}`}>
            <input type="radio" name="modeRadio" checked={mode === "direct"} onChange={() => setMode("direct")} className="sr-only" />
            <strong>Identifiants immédiats</strong>
            <span className="mt-0.5 block text-xs text-muted">Pas de mail : tu récupères l&apos;adresse et le mot de passe ici pour les transmettre toi-même. CGU déjà acceptées.</span>
          </label>
        </div>
        <input type="hidden" name="mode" value={mode} />
        {mode === "direct" && (
          <div>
            <label className="label" htmlFor="nu-pw">Mot de passe (aléatoire par défaut, modifiable)</label>
            <div className="flex flex-wrap items-center gap-2">
              <input id="nu-pw" name="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={200} required className="input max-w-xs font-mono" />
              <button type="button" className="btn-ghost" onClick={() => setPassword(randomPassword())} title="Générer un autre mot de passe aléatoire"><RefreshCw size={15} /> Régénérer</button>
              <CopyButton value={password} label="Copier le mot de passe" />
            </div>
            <p className="mt-1 text-xs text-muted">La personne pourra le changer ensuite depuis son profil.</p>
          </div>
        )}
      </fieldset>

      {alternants.length > 0 && (
        <div>
          <label className="label" htmlFor="nu-tutees">Référent (tuteur) de — voit leur agenda, leur pointeuse et leurs stats en lecture seule</label>
          <select id="nu-tutees" name="tuteeIds" multiple size={Math.min(6, alternants.length)} className="input">
            {alternants.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <p className="mt-1 text-xs text-muted">Facultatif : laisse vide si ce compte n&apos;a pas besoin de voir le planning d&apos;un alternant (ctrl/cmd + clic pour en choisir plusieurs).</p>
        </div>
      )}
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Création…" : mode === "direct" ? "Créer le compte" : "Créer le compte et envoyer le lien"}</button>
    </form>
  );
}

export function UserEditForm({
  user, roles, isSelf, ssoLinked,
}: {
  user: { id: number; firstName: string; lastName: string; email: string; roleId: number | null; status: "active" | "pending" | "disabled" | "rejected" };
  roles: { id: number; name: string }[];
  isSelf: boolean;
  ssoLinked: boolean;
}) {
  const [state, action, pending] = useActionState(updateUser, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={user.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="u-fn">Prénom</label><input id="u-fn" name="firstName" defaultValue={user.firstName} required maxLength={60} className="input" /></div>
        <div><label className="label" htmlFor="u-ln">Nom</label><input id="u-ln" name="lastName" defaultValue={user.lastName} required maxLength={60} className="input" /></div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="u-em">Adresse e-mail</label>
          <input id="u-em" name="email" type="email" defaultValue={user.email} required maxLength={190} disabled={ssoLinked} className="input disabled:opacity-60" />
          {ssoLinked && <p className="mt-1 text-xs text-muted">Connexion via Google ou Microsoft : l&apos;adresse vient de ce compte, elle ne se change pas ici.</p>}
          {ssoLinked && <input type="hidden" name="email" value={user.email} />}
        </div>
        <div>
          <label className="label" htmlFor="u-role">Rôle</label>
          <select id="u-role" name="roleId" defaultValue={user.roleId ?? ""} disabled={isSelf} className="input">{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
          {isSelf && <input type="hidden" name="roleId" value={user.roleId ?? ""} />}
        </div>
        <div>
          <label className="label" htmlFor="u-status">Statut</label>
          <select id="u-status" name="status" defaultValue={user.status} disabled={isSelf} className="input">
            <option value="active">Actif</option>
            <option value="pending">En attente de validation</option>
            <option value="disabled">Désactivé (ne peut plus se connecter)</option>
            <option value="rejected">Refusé (voit le refus en se connectant)</option>
          </select>
          {isSelf && <input type="hidden" name="status" value={user.status} />}
        </div>
      </div>
      {isSelf && <p className="text-xs text-muted">C&apos;est ton compte : tu ne peux pas changer ton propre rôle ni ton statut (pour éviter de te bloquer).</p>}
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
    </form>
  );
}

export function ResetPasswordForm({ id }: { id: number }) {
  const [state, action, pending] = useActionState(resetUserPassword, undefined);
  return (
    <form action={action} className="space-y-3" key={state?.ok ? "done" : "form"}>
      <input type="hidden" name="id" value={id} />
      <PasswordField id="admin-new-pw" name="password" label="Nouveau mot de passe (8 caractères min.)" autoComplete="new-password" minLength={8} />
      <Feedback state={state} />
      <button className="btn-ghost" disabled={pending}>{pending ? "…" : "Changer le mot de passe"}</button>
    </form>
  );
}

export function DeleteUserForm({ id, name }: { id: number; name: string }) {
  const [state, action, pending] = useActionState(deleteUser, undefined);
  return (
    <form action={action} onSubmit={(e) => { if (!confirm(`Supprimer définitivement ${name} ? Cette action est irréversible.`)) e.preventDefault(); }} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <button className="flex items-center gap-1 text-sm text-danger" disabled={pending}><Trash2 size={14} /> Supprimer cette personne</button>
      <Feedback state={state} />
    </form>
  );
}

export function AnonymizeUserForm({ id, name }: { id: number; name: string }) {
  const [state, action, pending] = useActionState(anonymizeUser, undefined);
  return (
    <form action={action} onSubmit={(e) => { if (!confirm(`Anonymiser ${name} ? Son nom et ses coordonnées disparaissent définitivement ; ses messages et avis restent mais sans être identifiables.`)) e.preventDefault(); }} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <button className="flex items-center gap-1 text-sm text-muted hover:text-danger" disabled={pending}><EyeOff size={14} /> Anonymiser cette personne</button>
      <Feedback state={state} />
    </form>
  );
}

/** Qualification du bureau : autocomplétion maison (liste cliquable, filtrée en tapant) à la place du
 *  <datalist> natif, peu fiable selon les navigateurs (suggestion qui ne s'applique pas, Entrée qui soumet
 *  le formulaire avant que la valeur ne soit prise en compte…). */
function OfficerTitleField({ id, name, defaultValue, options }: { id: string; name: string; defaultValue: string; options: string[] }) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const q = value.trim().toLowerCase();
  const matches = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;

  const choose = (v: string) => { setValue(v); setOpen(false); setActive(-1); };

  return (
    <div ref={boxRef} className="relative">
      <input
        id={id} name={name} value={value} autoComplete="off" maxLength={80} placeholder="Président, Trésorier adjoint…"
        className="input"
        onChange={(e) => { setValue(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || matches.length === 0) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % matches.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? matches.length - 1 : a - 1)); }
          else if (e.key === "Enter" && active >= 0) { e.preventDefault(); choose(matches[active]); }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-line bg-surface shadow-lg">
          {matches.map((o, i) => (
            <li key={o}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm ${i === active ? "bg-accent/15" : ""}`}
              >
                {o}
                {o === value && <Check size={14} className="text-accent" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Statut BDE de la personne (liste / CA / bureau + qualification), affiché dans l'organigramme.
 *  À appeler avec `key={bdeStatus ?? "none"}` : l'état local (statut choisi) doit repartir des props à jour
 *  après enregistrement, sinon le <select> reste figé sur la toute première valeur reçue au montage. */
export function BdeRoleForm({ userId, bdeStatus, bdeTitle, officerTitles }: { userId: number; bdeStatus: BdeStatus | null; bdeTitle: string | null; officerTitles: string[] }) {
  const [state, action, pending] = useActionState(saveUserBdeRole, undefined);
  const [status, setStatus] = useState<BdeStatus | "">(bdeStatus ?? "");
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="userId" value={userId} />
      <div>
        <label className="label" htmlFor="br-status">Statut BDE</label>
        <select id="br-status" name="bdeStatus" value={status} onChange={(e) => setStatus(e.target.value as BdeStatus | "")} className="input">
          <option value="">Aucun</option>
          {(Object.keys(BDE_STATUS_LABEL) as BdeStatus[]).map((s) => <option key={s} value={s}>{BDE_STATUS_LABEL[s]}</option>)}
        </select>
      </div>
      {status === "bureau" && (
        <div>
          <label className="label" htmlFor="br-title">Qualification</label>
          <OfficerTitleField id="br-title" name="bdeTitle" defaultValue={bdeTitle ?? ""} options={officerTitles} />
          <p className="mt-1 text-xs text-muted">Pas dans la liste ? Tape le titre exact : il sera proposé ensuite pour les prochaines personnes.</p>
        </div>
      )}
      <div className="sm:col-span-2"><Feedback state={state} /><button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button></div>
    </form>
  );
}
