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
