# Backstage

Hub de travail et d'information de la promo 3IS (régie technique) : école, profil, FAQ, liens utiles, et bientôt mobilité (TBM / V³), agenda Ypareo, projets, prêt de matériel, wiki, BDE.

**Stack** : Next.js 16 (App Router) · TypeScript · Tailwind 4 · Drizzle ORM · MySQL/MariaDB · auth maison (scrypt + sessions en base).

## Développement

```bash
cp .env.example .env.local     # renseigner DATABASE_URL
npm install
npm run db:migrate             # applique les migrations (dossier drizzle/)
npm run db:seed                # FAQ / liens d'exemple (facultatif)
npm run dev
```

Le **premier compte créé** devient administrateur. L'admin règle le Wi-Fi, le plan, les liens webmail/Ypareo/Studea, la FAQ, les liens utiles et les rôles.

Après une modification de `src/db/schema.ts` : `npm run db:generate` puis `npm run db:migrate`.

## Déploiement

Voir **[DEPLOY.md](DEPLOY.md)** : installation pas à pas sur Raspberry Pi (Node 22, MariaDB, systemd, Cloudflare Tunnel, sauvegardes, mises à jour).

En bref, sur le PC : `npm run package` construit `dist/backstage-<date>.tar.gz` (compilation faite ici, jamais sur le Pi), puis `install.sh` sur le Pi migre la base, bascule sur la nouvelle version et revient en arrière si le site ne répond pas.

## Fonctionnalités

Comptes et rôles · profil (adresse, iCal Ypareo) · thème clair/sombre · agenda · mobilité (TBM temps réel, Le Vélo, trajets) · école (Wi-Fi QR, plan) · projets (équipe, checklists, kanban, conduite, mode Jour J) · prêt de matériel · wiki · actualités · BDE (évènements, sondages, idées) · galerie photo/vidéo · flux Instagram · FAQ · liens utiles · PWA et notifications push · recherche globale · fiches techniques · connexion Microsoft (Office 365) et Google en option.

**Interface** : style « Mix » (menu ardoise façon AdminLTE avec profil en haut, cartes arrondies façon TailAdmin). Chaque personne règle son skin dans le panneau de droite : thème clair (blanc, par défaut) ou sombre, couleur d'accent (ambre, bleu, indigo, émeraude, rose) et menu sombre ou blanc. Le réglage est mémorisé dans un cookie et dans le compte.
