"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import type { FormState } from "@/lib/actions";
import { deleteRole, deleteUser, resetUserPassword, saveRole, updateUser } from "@/lib/user-admin-actions";
import { ADMIN_PERM, LEVEL_FIELDS, LEVEL_LABEL, levelOf, type Level } from "@/lib/perms";
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

export function UserEditForm({
  user, roles, isSelf,
}: {
  user: { id: number; firstName: string; lastName: string; email: string; roleId: number | null; status: "active" | "pending" | "disabled" };
  roles: { id: number; name: string }[];
  isSelf: boolean;
}) {
  const [state, action, pending] = useActionState(updateUser, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={user.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="u-fn">Prénom</label><input id="u-fn" name="firstName" defaultValue={user.firstName} required maxLength={60} className="input" /></div>
        <div><label className="label" htmlFor="u-ln">Nom</label><input id="u-ln" name="lastName" defaultValue={user.lastName} required maxLength={60} className="input" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="u-em">Adresse e-mail</label><input id="u-em" name="email" type="email" defaultValue={user.email} required maxLength={190} className="input" /></div>
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
