import Link from "next/link";

const PAGES = [
  { href: "/cgu", label: "CGU" },
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/politique-de-confidentialite", label: "Politique de confidentialité" },
];

// Navigation entre les trois pages légales, pour y circuler sans repasser par l'accueil.
export function LegalNav({ current }: { current: string }) {
  return (
    <nav className="flex flex-wrap gap-x-4 gap-y-1 border-b border-line pb-3 text-sm" aria-label="Pages légales">
      {PAGES.map((p) => (
        <Link key={p.href} href={p.href} aria-current={p.href === current ? "page" : undefined} className={p.href === current ? "font-medium text-accent" : "text-muted hover:text-fg"}>
          {p.label}
        </Link>
      ))}
    </nav>
  );
}
