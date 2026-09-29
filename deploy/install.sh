#!/usr/bin/env bash
# Installe une nouvelle version de Backstage sur le Raspberry Pi (à lancer avec sudo).
#   sudo /opt/backstage/install.sh /tmp/backstage-AAAAMMJJHHMM.tar.gz
#
# Principe : chaque version est décompressée dans /opt/backstage/releases/<horodatage>,
# migrée, puis le lien /opt/backstage/current bascule dessus. Un retour arrière = repointer
# le lien vers la version précédente (voir DEPLOY.md). Les données (photos, plan) vivent dans
# /opt/backstage/data et ne sont jamais écrasées.
set -euo pipefail

BASE=/opt/backstage
ARCHIVE="${1:?Usage : install.sh <archive.tar.gz>}"
[ -f "$ARCHIVE" ] || { echo "Archive introuvable : $ARCHIVE" >&2; exit 1; }
[ -f "$BASE/.env" ] || { echo "Il manque $BASE/.env (copie deploy/env.example)" >&2; exit 1; }

STAMP=$(date +%Y%m%d%H%M%S)
REL="$BASE/releases/$STAMP"

echo "→ Décompression dans $REL"
mkdir -p "$REL" "$BASE/data/uploads"
tar -xzf "$ARCHIVE" -C "$REL" --strip-components=1

# Les envois (plan, galerie) sont stockés hors de la version pour survivre aux mises à jour.
ln -sfn "$BASE/data" "$REL/app/data"

echo "→ Dépendances du script de migration"
( cd "$REL/migrate" && npm install --omit=dev --no-audit --no-fund --loglevel=error )

echo "→ Migrations de la base"
( set -a; . "$BASE/.env"; set +a; cd "$REL/migrate" && node migrate.mjs )

chown -R backstage:backstage "$REL" "$BASE/data"

echo "→ Bascule sur la nouvelle version"
PREVIOUS=$(readlink -f "$BASE/current" 2>/dev/null || true)
ln -sfn "$REL" "$BASE/current"
systemctl restart backstage

# Vérification : le site doit répondre, sinon retour automatique à la version précédente.
for i in $(seq 1 20); do
  if curl -fsS -o /dev/null "http://127.0.0.1:${PORT:-3000}/login"; then
    echo "✓ Backstage $STAMP est en ligne"
    # On garde les 3 dernières versions.
    ls -1dt "$BASE"/releases/* | tail -n +4 | xargs -r rm -rf
    exit 0
  fi
  sleep 2
done

echo "✗ Le site ne répond pas : retour à la version précédente" >&2
if [ -n "$PREVIOUS" ] && [ -d "$PREVIOUS" ]; then
  ln -sfn "$PREVIOUS" "$BASE/current"
  systemctl restart backstage
fi
journalctl -u backstage -n 30 --no-pager >&2 || true
exit 1
