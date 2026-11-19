import Link from "next/link";

const TABS = [
  { href: "/admin/comptabilite-parametres", label: "Général" },
  { href: "/admin/comptabilite-parametres/comptes", label: "Comptes" },
  { href: "/admin/comptabilite-parametres/exercices", label: "Exercices" },
];

export function FinanceSettingsTabs({ active }: { active: string }) {
  return (
    <nav className="flex gap-1 border-b border-line">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={`px-3 py-2 text-sm font-medium ${t.href === active ? "border-b-2 border-accent text-fg" : "text-muted hover:text-fg"}`}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
