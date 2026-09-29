// Bouton « Se connecter avec Microsoft » (lien : la connexion se fait sur le site de Microsoft).
export function MicrosoftButton({ label = "Se connecter avec Microsoft" }: { label?: string }) {
  return (
    <a
      href="/api/auth/microsoft/login"
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium transition hover:border-accent"
    >
      <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
        <rect x="1" y="1" width="9" height="9" fill="#f25022" />
        <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
        <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
        <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
      </svg>
      {label}
    </a>
  );
}
