"use client";

import { useActionState } from "react";
import { EyeOff, Trash2 } from "lucide-react";
import type { FormState } from "@/lib/actions";
import { anonymizeUser, createUser, deleteRole, deleteUser, resetUserPassword, saveRole, updateUser } from "@/lib/user-admin-actions";
import { ADMIN_PERM, COURSE_PAGES, LEVEL_FIELDS, LEVEL_LABEL, levelOf, SECTION_FIELDS, TICKETS_PERM, type Level } from "@/lib/perms";
import { TOGGLEABLE_GROUPS } from "@/lib/nav-data";
import { PasswordField } from "@/components/PasswordField";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

type RoleValues = { id?: number; name?: string; description?: string; isAdmin?: boolean; permAdministration?: boolean; system?: boolean } & Record<string, unknown>;

export function RoleForm({ role = {} }: { role?: RoleValues }) {
  const [state, action, pending] = useActionState(saveRole, undefined);
  const k = role.id ?? "new";
  return (
    <form action={action} className="space-y-4" key={role.id ? `e${role.id}` : state?.ok ? "done" : "new"}>
      {role.id && <input type="hidden" name="id" value={role.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor={`rn${k}`}>Nom du rôle</label><input id={`rn${k}`} name="name" defaultValue={role.name} required minLength={2} maxLength={60} placeholder="Régisseur, Tuteur, Intervenant…" className="input" /></div>
        <div><label className="label" htmlFor={`rd${k}`}>Description (facultatif)</label><input id={`rd${k}`} name="description" defaultValue={role.description} maxLength={200} className="input" /></div>
      </div>

      <fieldset className="space-y-2">
        <legend className="label">Droits</legend>
        <label className="flex items-start gap-3 rounded-xl border border-line p-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/5">
          <input type="checkbox" name="isAdmin" defaultChecked={role.isAdmin} disabled={role.system && role.isAdmin} className="mt-0.5 size-4 accent-[var(--accent)]" />
          <span><strong>Administrateur</strong><span className="block text-xs text-muted">Tous les droits ci-dessous, y compris ceux qu&apos;on ajoutera plus tard. À réserver à peu de personnes.</span></span>
        </label>
        {role.system && role.isAdmin && <input type="hidden" name="isAdmin" value="on" />}
        <label className="flex items-start gap-3 rounded-xl border border-line p-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/5">
          <input type="checkbox" name={ADMIN_PERM.field} defaultChecked={!!role[ADMIN_PERM.field]} className="mt-0.5 size-4 accent-[var(--accent)]" />
          <span><strong>{ADMIN_PERM.label}</strong><span className="block text-xs text-muted">{ADMIN_PERM.hint}</span></span>
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-line p-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/5">
          <input type="checkbox" name={TICKETS_PERM.field} defaultChecked={!!role[TICKETS_PERM.field]} className="mt-0.5 size-4 accent-[var(--accent)]" />
          <span><strong>{TICKETS_PERM.label}</strong><span className="block text-xs text-muted">{TICKETS_PERM.hint}</span></span>
        </label>
        <div className="space-y-2">
          {LEVEL_FIELDS.map((f) => {
            const cur = levelOf(role, f);
            return (
              <div key={f.module} className="rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm">{f.label}</strong>
                  <div role="radiogroup" aria-label={f.label} className="flex overflow-hidden rounded-lg border border-line text-sm">
                    {(["none", "view", "manage"] as Level[]).map((lv) => (
                      <label key={lv} className="cursor-pointer border-l border-line px-3 py-1 first:border-l-0 has-[:checked]:bg-accent has-[:checked]:text-accent-fg">
                        <input type="radio" name={`level_${f.module}`} value={lv} defaultChecked={role.id ? cur === lv : lv === "view"} className="sr-only" />
                        {LEVEL_LABEL[lv]}
                      </label>
                    ))}
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted">{f.hint}</p>
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="label">Sections du menu</legend>
        <p className="text-xs text-muted">« Aucun » retire toute la section du menu pour ce rôle (utile pour un accès externe réduit à l&apos;essentiel). L&apos;assistant en bas à droite reste toujours disponible.</p>
        <div className="space-y-2">
          {SECTION_FIELDS.map((sf) => {
            const cur = role.id ? (role[sf.field] ? "view" : "none") : "view";
            return (
              <div key={sf.key} className="rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm">{sf.label}</strong>
                  <div role="radiogroup" aria-label={sf.label} className="flex overflow-hidden rounded-lg border border-line text-sm">
                    {(["none", "view"] as const).map((lv) => (
                      <label key={lv} className="cursor-pointer border-l border-line px-3 py-1 first:border-l-0 has-[:checked]:bg-accent has-[:checked]:text-accent-fg">
                        <input type="radio" name={`section_${sf.key}`} value={lv} defaultChecked={cur === lv} className="sr-only" />
                        {lv === "none" ? "Aucun" : "Voir"}
                      </label>
                    ))}
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted">{sf.hint}</p>
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="label">Pages du menu</legend>
        <p className="text-xs text-muted">Décoche une page précise pour la retirer du menu de ce rôle, sans toucher aux autres (ex. accès à Alternance mais pas à la Pointeuse). Les domaines avec un niveau Voir/Gérer ci-dessus, et les pages de Cours, se règlent séparément.</p>
        <div className="space-y-3">
          {TOGGLEABLE_GROUPS.map((g) => {
            const hiddenSet = typeof role.hiddenPages === "string" ? new Set(role.hiddenPages.split(",")) : new Set<string>();
            return (
              <div key={g.id} className="rounded-xl border border-line p-3">
                <strong className="text-sm">{g.title}</strong>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                  {g.pages.map((pg) => (
                    <label key={pg.href} className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" name={`page_${pg.href}`} defaultChecked={!role.id || !hiddenSet.has(pg.href)} className="size-4 accent-[var(--accent)]" />
                      {pg.label}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="label">Pages de Cours (sous-menu de Travail)</legend>
        <p className="text-xs text-muted">« Aucun » retire cette page précise du sous-menu Cours, sans toucher aux autres. D&apos;autres pages s&apos;ajouteront ici avec le temps.</p>
        <div className="space-y-2">
          {COURSE_PAGES.map((cp) => {
            const tags = typeof role.courseTags === "string" ? role.courseTags : null;
            const cur = !role.id || !tags ? "view" : tags.split(",").includes(cp.key) ? "view" : "none";
            return (
              <div key={cp.key} className="rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm">{cp.label}</strong>
                  <div role="radiogroup" aria-label={cp.label} className="flex overflow-hidden rounded-lg border border-line text-sm">
                    {(["none", "view"] as const).map((lv) => (
                      <label key={lv} className="cursor-pointer border-l border-line px-3 py-1 first:border-l-0 has-[:checked]:bg-accent has-[:checked]:text-accent-fg">
                        <input type="radio" name={`course_${cp.key}`} value={lv} defaultChecked={cur === lv} className="sr-only" />
                        {lv === "none" ? "Aucun" : "Voir"}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>

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
 * typiquement un tuteur en entreprise. Un lien d'activation (choix du mot de passe, puis CGU) part par mail.
 * « Référent de » rattache directement ce compte au planning/pointeuse des alternants choisis (lecture seule).
 */
export function CreateUserForm({ roles, alternants }: { roles: { id: number; name: string }[]; alternants: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState(createUser, undefined);
  return (
    <form action={action} className="space-y-4" key={state?.ok ? "done" : "form"}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="nu-fn">Prénom</label><input id="nu-fn" name="firstName" required maxLength={60} className="input" /></div>
        <div><label className="label" htmlFor="nu-ln">Nom</label><input id="nu-ln" name="lastName" required maxLength={60} className="input" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="nu-em">Adresse e-mail (sert à l&apos;identifiant et au lien d&apos;activation)</label><input id="nu-em" name="email" type="email" required maxLength={190} className="input" /></div>
        <div>
          <label className="label" htmlFor="nu-role">Rôle</label>
          <select id="nu-role" name="roleId" defaultValue="" required className="input">
            <option value="" disabled>Choisir…</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      </div>
      {alternants.length > 0 && (
        <div>
          <label className="label" htmlFor="nu-tutees">Référent (tuteur) de — voit leur pointeuse et leurs stats en lecture seule</label>
          <select id="nu-tutees" name="tuteeIds" multiple size={Math.min(6, alternants.length)} className="input">
            {alternants.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <p className="mt-1 text-xs text-muted">Facultatif : laisse vide si ce compte n&apos;a pas besoin de voir le planning d&apos;un alternant (ctrl/cmd + clic pour en choisir plusieurs).</p>
        </div>
      )}
      <p className="text-xs text-muted">Un mail est envoyé à cette adresse avec un lien (valable 7 jours) pour choisir un mot de passe et accepter les CGU.</p>
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Création…" : "Créer le compte et envoyer le lien"}</button>
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
