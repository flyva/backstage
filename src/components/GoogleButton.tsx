// Bouton « Continuer avec Google » (lien : la connexion se fait sur le site de Google).
export function GoogleButton({ label = "Continuer avec Google", disabled = false }: { label?: string; disabled?: boolean }) {
  if (disabled) {
    // Visible uniquement en développement : montre où sera le bouton tant que Google n'est pas configuré.
    return (
      <div className="space-y-1.5">
        <span aria-disabled className="flex w-full cursor-not-allowed items-center justify-center gap-3 rounded-xl border border-dashed border-line px-4 py-2.5 text-sm font-medium text-muted">
          {label} (non configuré)
        </span>
        <p className="text-xs text-muted">
          Renseigne GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans .env.local (voir DEPLOY.md, section 12). Ce message n&apos;apparaît qu&apos;en développement.
        </p>
      </div>
    );
  }
  return (
    <a
      href="/api/auth/google/login"
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium transition hover:border-accent"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.5-4.2 7-10.3 7-17.6z" />
        <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z" />
      </svg>
      {label}
    </a>
  );
}
