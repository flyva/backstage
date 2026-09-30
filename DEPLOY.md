# Déployer Backstage sur le Raspberry Pi

Guide pas à pas. Tout se fait **une seule fois**, ensuite une mise à jour = `npm run package` sur le PC + un `scp` + une commande sur le Pi.

## 0. Vérifier le Pi

```bash
uname -m          # armv7l = système 32 bits
getconf LONG_BIT  # 32 ou 64
free -h           # RAM disponible
```

> **32 bits** : Node.js 24 et plus ne fournissent plus de binaire ARM 32 bits. Il faut **Node 22 LTS** (maintenu jusqu'en avril 2027). Passé cette date, il faudra un système 64 bits (Raspberry Pi OS 64-bit sur Pi 3/4/5) : la migration se résume à réinstaller l'OS, restaurer la base et le dossier `data/`.

## 1. Installer Node 22

```bash
# Adapter la version : https://nodejs.org/dist/latest-v22.x/ (fichier « linux-armv7l »)
cd /tmp
curl -O https://nodejs.org/dist/latest-v22.x/node-v22.23.3-linux-armv7l.tar.xz
sudo tar -xJf node-v22.23.3-linux-armv7l.tar.xz -C /usr/local --strip-components=1
node -v && npm -v
```

Sur un Pi 64 bits, prendre `linux-arm64` à la place.

## 2. Swap (recommandé avec 1 Go)

```bash
sudo dphys-swapfile swapoff
sudo sed -i 's/^CONF_SWAPSIZE=.*/CONF_SWAPSIZE=1024/' /etc/dphys-swapfile
sudo dphys-swapfile setup && sudo dphys-swapfile swapon
```

## 3. Base de données (celle qui tourne déjà sur le Pi)

```bash
sudo mysql
```

```sql
CREATE DATABASE backstage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'backstage'@'127.0.0.1' IDENTIFIED BY 'UN_MOT_DE_PASSE_SIMPLE';
CREATE USER 'backstage'@'localhost' IDENTIFIED BY 'UN_MOT_DE_PASSE_SIMPLE';
GRANT ALL PRIVILEGES ON backstage.* TO 'backstage'@'127.0.0.1', 'backstage'@'localhost';
FLUSH PRIVILEGES;
```

> Évite les caractères `@ : / ? & #` dans le mot de passe : il est placé dans une URL (`DATABASE_URL`) et lu par le script de sauvegarde. La base est **dédiée à Backstage** : elle ne touche pas à celle d'Adie.

## 4. Utilisateur et dossiers

```bash
sudo useradd --system --home /opt/backstage --shell /usr/sbin/nologin backstage
sudo mkdir -p /opt/backstage/{releases,data/uploads,backups}
sudo chown -R backstage:backstage /opt/backstage
```

## 5. Configuration

Sur le **PC**, génère les clés dont tu as besoin :

```bash
npx web-push generate-vapid-keys      # → VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY
openssl rand -hex 24                  # → CRON_SECRET     (ou : node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
```

Sur le **Pi**, crée `/opt/backstage/.env` à partir de `deploy/env.example` :

```bash
sudo nano /opt/backstage/.env
sudo chown backstage:backstage /opt/backstage/.env && sudo chmod 600 /opt/backstage/.env
```

Points importants :

- **`REGISTRATION_CODE`** : définis-le **avant** d'ouvrir le site. Sans lui, n'importe qui connaissant l'adresse peut créer un compte et voir le mot de passe du Wi-Fi de l'école. Donne le code à ta promo.
- **`VAPID_SUBJECT`** : l'adresse est transmise aux services de push (Google, Apple…). Mets une adresse que tu acceptes de partager.
- **Le premier compte créé devient administrateur.** Crée le tien tout de suite après l'installation, avant de communiquer l'adresse.

## 6. Première installation

Sur le **PC** :

```bash
npm run package
scp dist/backstage-*.tar.gz pi@raspberrypi.local:/tmp/
scp deploy/install.sh deploy/backup.sh pi@raspberrypi.local:/tmp/
```

Sur le **Pi** :

```bash
sudo install -m 755 /tmp/install.sh /tmp/backup.sh /opt/backstage/
sudo /opt/backstage/install.sh /tmp/backstage-AAAAMMJJHHMM.tar.gz
```

Puis, la première fois seulement, installe les services (fichiers dans `deploy/`, décompressés dans `/opt/backstage/current/deploy/`) :

```bash
cd /opt/backstage/current/deploy
sudo cp backstage.service backstage-reminders.service backstage-reminders.timer backstage-backup.service backstage-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now backstage backstage-reminders.timer backstage-backup.timer
sudo systemctl restart backstage
```

Vérifier :

```bash
systemctl status backstage
curl -I http://127.0.0.1:3000/login          # → 200
journalctl -u backstage -f                   # journaux en direct
systemctl list-timers | grep backstage       # rappels 7h30, sauvegarde 3h
```

## 7. Accès depuis internet : Cloudflare Tunnel

Le site n'écoute qu'en local (`127.0.0.1:3000`) ; `cloudflared` le publie en HTTPS sans ouvrir de port sur la box. **Le HTTPS est obligatoire** (cookies de session, application installable, notifications).

```bash
# Pi 32 bits : binaire « arm » ; Pi 64 bits : « arm64 »
curl -L -o cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm
sudo install -m 755 cloudflared /usr/local/bin/cloudflared

cloudflared tunnel login                      # ouvre un lien : choisir le domaine
cloudflared tunnel create backstage
cloudflared tunnel route dns backstage backstage.exemple.fr
sudo mkdir -p /etc/cloudflared && sudo cp ~/.cloudflared/*.json /etc/cloudflared/
sudo cp /opt/backstage/current/deploy/cloudflared-config.yml /etc/cloudflared/config.yml   # puis l'éditer
sudo cloudflared service install
```

### Nom de domaine

Cloudflare **ne fournit pas de nom de domaine gratuit** : le tunnel a besoin d'un domaine dont la zone DNS est gérée par Cloudflare (gratuit). Options :

| Option | Coût | Remarques |
|---|---|---|
| **Sous-domaine d'un domaine OVH que tu as déjà** (`backstage.tondomaine.fr`) | 0 € | Il faut déléguer la zone DNS du domaine à Cloudflare (changer les serveurs de noms chez OVH). Les autres services du domaine continuent de marcher, à condition de recréer leurs enregistrements dans Cloudflare avant de basculer. |
| **Domaine dédié à Backstage** | ~1–8 €/an | Le plus propre : rien à toucher sur tes autres domaines. |
| **Tunnel « rapide » `trycloudflare.com`** | 0 € | L'adresse change à chaque redémarrage : à réserver aux tests. |
| **Tailscale Funnel** | 0 € | Adresse fixe en `*.ts.net`, sans domaine ; moins jolie. |

## 8. Mettre à jour

```bash
# PC
npm run package
scp dist/backstage-*.tar.gz pi@raspberrypi.local:/tmp/
# Pi
sudo /opt/backstage/install.sh /tmp/backstage-AAAAMMJJHHMM.tar.gz
```

`install.sh` migre la base, bascule sur la nouvelle version, **vérifie que le site répond** et revient tout seul à la version précédente sinon. Les 3 dernières versions sont conservées.

Retour arrière manuel :

```bash
ls /opt/backstage/releases
sudo ln -sfn /opt/backstage/releases/<ancienne-version> /opt/backstage/current
sudo systemctl restart backstage
```

> Une migration de base n'est **pas** annulée par un retour arrière. Les migrations de Backstage ajoutent des colonnes/tables sans rien supprimer, l'ancienne version reste donc compatible ; en cas de doute, restaure la sauvegarde.

## 9. Sauvegardes

Chaque nuit à 3 h : base + dossier `data/uploads` (plan, galerie) dans `/opt/backstage/backups`, 14 jours conservés. **Une sauvegarde sur la même carte SD ne protège pas d'une carte morte** : copie régulièrement ce dossier ailleurs (PC, NAS, cloud).

```bash
scp pi@raspberrypi.local:/opt/backstage/backups/* ./sauvegardes-backstage/
```

Restauration :

```bash
gunzip -c db-AAAAMMJJ-HHMM.sql.gz | mysql -u backstage -p backstage
sudo tar -xzf uploads-AAAAMMJJ-HHMM.tar.gz -C /opt/backstage/data
```

## 10. Dépannage

| Symptôme | Piste |
|---|---|
| `install.sh` : « Le site ne répond pas » | `journalctl -u backstage -n 50` : `.env` incomplet ? base inaccessible ? |
| Erreur de mémoire / le Pi rame | `free -h`, vérifier le swap ; le service est plafonné à 450 Mo (`MemoryMax`). |
| Impossible de se connecter en HTTPS | Le cookie de session exige HTTPS : passer par le tunnel, pas par `http://ip-du-pi:3000`. |
| Notifications absentes | HTTPS obligatoire ; sur iPhone, installer d'abord l'app (Partager → Sur l'écran d'accueil, iOS ≥ 16.4) ; vérifier `VAPID_*`. |
| Rappels de prêt non reçus | `systemctl list-timers`, `journalctl -u backstage-reminders`. |
| Photos/vidéos refusées | Quota `GALLERY_MAX_MB` atteint, ou vidéo > 150 Mo / format autre que MP4 et WebM. |
| Page « Bienvenue » mais pas admin | Un autre compte a été créé avant toi : `UPDATE users SET role='admin' WHERE email='toi@…';` |

## 11. Connexion avec Microsoft (Office 365)

Permet de se connecter et de s'inscrire avec le compte Office 365 de l'école, sans mot de passe à retenir. **Tu n'as pas besoin d'être administrateur du Office 365 de l'école** pour créer l'application, mais voir la limite ci-dessous.

### Créer l'application (dans ton propre espace Microsoft, pas celui de l'école)

1. Va sur <https://entra.microsoft.com> (ou portal.azure.com) avec un compte Microsoft **personnel** (crée-en un gratuit si besoin), puis **Applications → Inscriptions d'applications → Nouvelle inscription**.
2. Nom : `Backstage`. Types de comptes pris en charge : **« Comptes dans un annuaire d'organisation (multilocataire) »** (indispensable pour que les comptes de l'école puissent se connecter).
3. URI de redirection (type **Web**) : `https://backstage.exemple.fr/api/auth/microsoft/callback`. Pour tester en local, ajoutes-en une seconde : `http://localhost:3100/api/auth/microsoft/callback`.
4. Sur la page de l'application, note l'**ID d'application (client)**.
5. **Certificats et secrets → Nouveau secret client** : copie **la valeur** tout de suite (elle ne sera plus affichée). Note sa date d'expiration : prévois de le renouveler avant.
6. **Autorisations d'API** : rien à ajouter (la connexion n'utilise que `openid`, `profile`, `email`).

### Limiter à l'école : le domaine `3is.fr`

Dans `/opt/backstage/.env`, mets simplement :

```
ALLOWED_EMAIL_DOMAINS="3is.fr"
MS_CLIENT_ID="…"          # ID d'application (client)
MS_CLIENT_SECRET="…"      # valeur du secret
APP_URL="https://backstage.exemple.fr"
```

Deux contrôles s'appliquent **ensemble** à chaque connexion ou inscription Microsoft :

1. **L'organisation Microsoft du compte doit être celle du domaine `3is.fr`** : Backstage la retrouve tout seul auprès de Microsoft (aucun identifiant à chercher). Un compte d'une autre organisation est refusé, même s'il déclare une adresse en `@3is.fr`.
2. **L'adresse doit être exactement en `@3is.fr`** : `@gmail.com`, `@evil3is.fr`, `@sous.3is.fr` et `a@3is.fr@evil.com` sont refusées.

Avec `ALLOWED_EMAIL_DOMAINS` défini, l'**inscription par mot de passe** est aussi réservée à ces adresses (les comptes existants ne sont pas touchés). Plusieurs domaines possibles, séparés par des virgules.

> L'adresse utilisée est celle de messagerie du compte. Si certains comptes de l'école ont un identifiant de connexion en `@3is.onmicrosoft.com` mais une adresse en `@3is.fr`, tout fonctionne ; si leur adresse de messagerie n'est pas renseignée, ils seront refusés.
> Si Microsoft est injoignable au moment de la connexion, personne n'entre (par sécurité) : réessaie plus tard.
> Le premier compte créé devient administrateur : s'il n'est pas en `@3is.fr`, retire momentanément `ALLOWED_EMAIL_DOMAINS` pour le créer.

### Comportement

- Première connexion : le compte Backstage est **créé automatiquement** (nom et email repris de Microsoft). Le tout premier compte de l'application devient administrateur.
- Si un compte à mot de passe existe déjà avec cette adresse, il est **lié** à Microsoft, son ancien mot de passe est rendu inutilisable et ses sessions sont fermées (personne ne peut « réserver » l'adresse d'un autre).
- Les comptes Microsoft n'ont pas de mot de passe Backstage : ils passent toujours par le bouton.

### Limite importante : le consentement de l'organisation

Microsoft demande souvent l'accord d'un **administrateur** de l'école la première fois, pour une application multi-organisation d'un éditeur non vérifié : les élèves voient alors « **Approbation de l'administrateur requise** ». Si c'est le cas, il faut demander au service informatique de l'école d'autoriser l'application **une seule fois** (il a un lien de consentement administrateur à ouvrir avec l'ID d'application) ; ensuite tout le monde peut se connecter. S'il refuse, garde l'inscription par mot de passe avec `REGISTRATION_CODE`.

## 12. Connexion avec Google (comptes personnels)

Permet à quelqu'un **sans adresse de l'école** de se connecter avec son compte Google. La règle :

- **Adresse `@3is.fr` (ou autre domaine de `ALLOWED_EMAIL_DOMAINS`) vérifiée par Google** : accès immédiat.
- **Toute autre adresse Google** : le compte est créé « **en attente** ». La personne voit seulement une page d'attente, sans accès à aucune donnée, jusqu'à ce qu'un administrateur clique sur **Valider** dans *Administration → En attente de validation*. Un refus supprime le compte.
- Une adresse que Google n'a pas vérifiée est refusée.
- Le tout premier compte administrateur ne peut **jamais** venir d'un Google personnel : crée-le par mot de passe (adresse `@3is.fr`) ou avec une adresse autorisée.

### Créer les identifiants (Google Cloud Console, gratuit)

1. Va sur <https://console.cloud.google.com> avec ton compte Google, puis **Nouveau projet** : `Backstage`.
2. **API et services → Écran de consentement OAuth** (ou « Google Auth Platform ») : type d'utilisateur **Externe** (nécessaire pour les comptes personnels). Renseigne le nom de l'application, ton email d'assistance et de contact. Scopes : uniquement `openid`, `email`, `profile` (aucune vérification Google n'est demandée pour ces trois-là).
3. **Publie l'application** (passage de « Test » à « En production ») : en mode test, seuls 100 comptes ajoutés à la main peuvent se connecter.
4. **Identifiants → Créer des identifiants → ID client OAuth → Application Web**. **URI de redirection autorisés** :
   - `http://localhost:3100/api/auth/google/callback` (test en local)
   - `https://backstage.exemple.fr/api/auth/google/callback` (production)
5. Copie l'**ID client** et le **code secret du client**.

### Configurer Backstage

Dans `.env.local` (PC) ou `/opt/backstage/.env` (Pi) :

```
GOOGLE_CLIENT_ID="…"
GOOGLE_CLIENT_SECRET="…"
ALLOWED_EMAIL_DOMAINS="3is.fr"
APP_URL="https://backstage.exemple.fr"     # obligatoire en production
```

Redémarre le serveur : le bouton « Continuer avec Google » apparaît sur les pages de connexion et d'inscription. Si un compte à mot de passe existe déjà avec la même adresse, il est lié à Google (ancien mot de passe et sessions révoqués).

## 13. Temps en voiture avec les embouteillages (TomTom)

La page **Mobilité** affiche le temps en voiture domicile → école. **Sans clé**, c'est une estimation sans circulation (OpenStreetMap). **Avec une clé TomTom**, le temps tient compte des embouteillages en direct, avec un indicateur « Circulation fluide / Ralentissements / Embouteillages » et le retard dû au trafic.

1. Crée un compte gratuit sur <https://developer.tomtom.com> (aucune carte bancaire demandée pour l'offre gratuite).
2. Dans le tableau de bord, **créer une clé API** (produit « Routing » activé). Le quota gratuit est d'environ 2 500 requêtes par jour ; Backstage mémorise chaque trajet 3 minutes, ce qui suffit largement pour une promo.
3. Ajoute la clé dans `.env.local` (PC) ou `/opt/backstage/.env` (Pi) :

```
TOMTOM_API_KEY="ta-cle"
```

Redémarre le serveur. Si TomTom est injoignable ou si le quota est dépassé, la page retombe automatiquement sur l'estimation sans trafic.

## 14. Nouvelles fonctions (rappels, hors ligne, fichiers)

- **Rappels** : le minuteur quotidien existant (`/api/cron/reminders`) envoie maintenant aussi les échéances de tâches kanban (aujourd'hui, demain, en retard) et « Demain : école / entreprise » d'après le planning de l'alternance. Chaque personne peut les couper dans Paramètres → Notifications. Aucune nouvelle variable d'environnement.
- **Jour J hors ligne** : la page `public/jour-j-offline.html` est mise en cache par le service worker (version `backstage-static-v2`) ; la conduite est enregistrée dans le navigateur à chaque ouverture du Jour J avec du réseau. Après la mise à jour, ouvrir le Jour J une fois en ligne sur chaque appareil.
- **Fichiers du wiki, des articles et des mémoires** : dossier `data/uploads/wiki` (inclus dans la sauvegarde nocturne), quota `WIKI_FILES_MAX_MB` (512 par défaut).
- **Migrations** : `npm run db:migrate` (ou le script d'installation) applique les migrations 0017 à 0027 (dont les rôles : les comptes existants gardent leur rôle d'origine).
- **Guide de rentrée** : après la mise à jour, ouvrir Administration → Général → « Importer le guide de rentrée 2026-2027 » (une fois, sur le Pi) : ça remplit l'annuaire, la FAQ, les liens, le wiki et les réglages de l'école, sans rien écraser. Migrations jusqu'à 0028.

## 15. E-mails : mot de passe oublié

Backstage n'envoie qu'un type de mail : le lien « Mot de passe oublié » (valable 1 heure, à usage unique, ferme tous les appareils une fois utilisé). Il faut un SMTP :

1. Crée un compte gratuit chez un service d'envoi (**Brevo**, **Mailjet** ou **Resend** : quelques centaines de mails par jour gratuits, largement assez), ou utilise le SMTP de ton hébergeur.
2. Sur ton domaine, ajoute les enregistrements DNS que le service te demande (**SPF** et **DKIM**, idéalement **DMARC**) : sans eux, les mails finissent en indésirables.
3. Renseigne `MAIL_HOST`, `MAIL_PORT` (587), `MAIL_USER`, `MAIL_PASS` et `MAIL_FROM` (par exemple `Backstage <noreply@ton-domaine.fr>`) dans le fichier d'environnement, et `APP_URL` avec l'adresse publique du site. Redémarre le service.

Sur un VPS OVH, le port 25 sortant est bloqué par défaut : on n'en a pas besoin, on utilise le port 587 d'un service d'envoi. N'installe pas de serveur de mail sur le VPS. Sans `MAIL_HOST`, aucun mail n'est envoyé (en développement, le lien s'affiche dans la console du serveur). Migration : 0029.
