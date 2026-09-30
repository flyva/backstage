"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/lib/actions";
import { requestPasswordReset, resetPassword } from "@/lib/password-reset";
import { PasswordField } from "@/components/PasswordField";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400" role="status">{state.ok}</p>;
  return null;
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="fp-email">Ton adresse e-mail</label>
        <input id="fp-email" name="email" type="email" required autoComplete="email" maxLength={190} placeholder="prenom.nom@3is.fr" className="input" />
      </div>
      <Feedback state={state} />
      <button className="btn w-full" disabled={pending || !!state?.ok}>{pending ? "Envoi…" : "Envoyer le lien"}</button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, undefined);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const mismatch = pw2 !== "" && pw !== pw2;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <PasswordField id="rp-pw" name="password" label="Nouveau mot de passe (8 caractères min.)" autoComplete="new-password" minLength={8} onValueChange={setPw} />
      <div>
        <PasswordField id="rp-pw2" name="password2" label="Confirme le mot de passe" autoComplete="new-password" minLength={8} onValueChange={setPw2} invalid={mismatch} />
        {mismatch && <p className="mt-1 text-xs text-danger" role="alert">Les deux mots de passe ne correspondent pas.</p>}
      </div>
      <Feedback state={state} />
      <button className="btn w-full" disabled={pending || mismatch}>{pending ? "Enregistrement…" : "Changer le mot de passe"}</button>
    </form>
  );
}
