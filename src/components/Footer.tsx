import Link from "next/link";

// Pied de page léger, avec les pages légales — présent partout (dans l'appli comme sur connexion/inscription).
export function Footer() {
  return (
    <footer className="py-4 text-center text-xs text-muted print:hidden">
      <Link href="/cgu" className="underline hover:text-fg">CGU</Link>
      {" · "}
      <Link href="/mentions-legales" className="underline hover:text-fg">Mentions légales</Link>
      {" · "}
      <Link href="/politique-de-confidentialite" className="underline hover:text-fg">Politique de confidentialité</Link>
    </footer>
  );
}
