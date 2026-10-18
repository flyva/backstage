import Link from "next/link";

// Pied de page léger, avec les pages légales et la version déployée — présent partout (dans l'appli comme sur
// connexion/inscription). Tout à droite : discret, sans gêner le contenu du pied de page.
export function Footer() {
  return (
    <footer className="flex justify-end py-4 text-xs text-muted print:hidden">
      <p>
        <Link href="/cgu" className="underline hover:text-fg">CGU</Link>
        {" · "}
        <Link href="/mentions-legales" className="underline hover:text-fg">Mentions légales</Link>
        {" · "}
        <Link href="/politique-de-confidentialite" className="underline hover:text-fg">Politique de confidentialité</Link>
        {process.env.APP_VERSION && <span className="ml-2 opacity-60">· v{process.env.APP_VERSION}</span>}
      </p>
    </footer>
  );
}
