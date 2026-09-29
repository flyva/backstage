"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// Champ mot de passe avec bouton « afficher / masquer » (JavaScript côté navigateur uniquement :
// la valeur n'est jamais envoyée ailleurs qu'au formulaire).
export function PasswordField({
  id,
  name,
  label,
  autoComplete,
  minLength,
  hint,
  onValueChange,
  invalid,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  hint?: string;
  onValueChange?: (v: string) => void;
  invalid?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          required
          aria-invalid={invalid || undefined}
          onChange={(e) => onValueChange?.(e.target.value)}
          className={`input pr-10 ${invalid ? "border-danger focus:border-danger focus:ring-danger/30" : ""}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:text-fg"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
