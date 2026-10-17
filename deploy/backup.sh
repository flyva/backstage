#!/usr/bin/env bash
# Sauvegarde quotidienne : base de données + envois (photos, plan). Conserve 14 jours en local.
# Deux copies hors du Pi, facultatives (voir DEPLOY.md section 9) :
#  - REMOTE_DB_URL : le dump est rejoué (DROP + CREATE + données) sur une base MySQL externe (ex. OVH).
#  - RCLONE_REMOTE : les deux fichiers du jour sont copiés sur un stockage distant (ex. Google Drive) via rclone.
#   sudo /opt/backstage/backup.sh        (lancé chaque nuit par backstage-backup.timer)
set -euo pipefail

BASE=/opt/backstage
DEST="${BACKUP_DIR:-$BASE/backups}"
STAMP=$(date +%Y%m%d-%H%M)
mkdir -p "$DEST"

# Lit .env sans exposer les mots de passe dans la liste des processus. Parsing volontairement simple :
# suppose que les mots de passe ne contiennent ni « @ » ni « : » ni « / » (évite ces caractères en les générant).
set -a; . "$BASE/.env"; set +a
URL="${DATABASE_URL#mysql://}"
USERPASS="${URL%%@*}"; HOSTDB="${URL#*@}"
DB_USER="${USERPASS%%:*}"; DB_PASS="${USERPASS#*:}"
DB_HOST="${HOSTDB%%[:/]*}"; DB_NAME="${HOSTDB##*/}"; DB_NAME="${DB_NAME%%\?*}"

DUMP="$DEST/db-$STAMP.sql"
MYSQL_PWD="$DB_PASS" mysqldump --single-transaction --no-tablespaces --add-drop-table -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" > "$DUMP"
gzip "$DUMP"
tar -czf "$DEST/uploads-$STAMP.tar.gz" -C "$BASE/data" uploads 2>/dev/null || true

# Miroir distant optionnel : rejoue le même dump sur une base MySQL externe (ex. OVH). N'empêche jamais la
# sauvegarde locale de réussir si le réseau ou la base distante est indisponible ce soir-là.
if [ -n "${REMOTE_DB_URL:-}" ]; then
  RURL="${REMOTE_DB_URL#mysql://}"
  RUSERPASS="${RURL%%@*}"; RHOSTDB="${RURL#*@}"
  R_USER="${RUSERPASS%%:*}"; R_PASS="${RUSERPASS#*:}"
  R_HOSTPORT="${RHOSTDB%%/*}"
  R_HOST="${R_HOSTPORT%%:*}"
  R_PORT="${R_HOSTPORT#*:}"; [ "$R_PORT" = "$R_HOSTPORT" ] && R_PORT=3306
  R_NAME="${RHOSTDB#*/}"; R_NAME="${R_NAME%%\?*}"
  if gunzip -c "$DEST/db-$STAMP.sql.gz" | MYSQL_PWD="$R_PASS" mysql --ssl-mode=REQUIRED -h "$R_HOST" -P "$R_PORT" -u "$R_USER" "$R_NAME"; then
    echo "✓ Miroir distant à jour sur $R_HOST"
  else
    echo "⚠ Échec du miroir distant ($R_HOST) : la sauvegarde locale est quand même faite" >&2
  fi
fi

# Copie distante optionnelle (ex. Google Drive) via rclone, déjà configuré (sudo rclone config). N'empêche
# jamais la sauvegarde locale de réussir si rclone n'est pas installé/configuré ou si le réseau coupe.
if [ -n "${RCLONE_REMOTE:-}" ] && command -v rclone >/dev/null 2>&1; then
  if rclone copy "$DEST/db-$STAMP.sql.gz" "$RCLONE_REMOTE" && rclone copy "$DEST/uploads-$STAMP.tar.gz" "$RCLONE_REMOTE"; then
    echo "✓ Copié sur $RCLONE_REMOTE"
  else
    echo "⚠ Échec de la copie vers $RCLONE_REMOTE : la sauvegarde locale est quand même faite" >&2
  fi
fi

find "$DEST" -type f -mtime +14 -delete
chmod 600 "$DEST"/*
echo "✓ Sauvegarde $STAMP dans $DEST"
