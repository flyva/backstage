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

## Déploiement sur Raspberry Pi (32 bits, 1 Go)

Toujours **compiler sur le PC**, jamais sur le Pi :

```bash
npm run build
```

Copier sur le Pi : `.next/standalone/`, `.next/static/` (dans `.next/standalone/.next/static`), `public/` et `drizzle/`. Puis, sur le Pi :

```bash
PORT=3000 HOSTNAME=127.0.0.1 DATABASE_URL="mysql://..." node server.js
```

À lancer via `systemd` pour le redémarrage automatique. Le dossier `data/uploads/` (plan de l'école) doit être conservé entre les déploiements. Le projet n'utilise aucune dépendance native (pas de `sharp`, hachage via `node:crypto`), pour rester compatible ARM 32 bits ; il faut seulement une version de Node qui fournit un binaire `armv7l`.

## Exposition

Cloudflare Tunnel (`cloudflared`) vers `http://127.0.0.1:3000`. Le HTTPS est indispensable (cookies de session `secure`, PWA, notifications).
