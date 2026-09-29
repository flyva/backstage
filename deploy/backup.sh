#!/usr/bin/env bash
# Sauvegarde quotidienne : base de données + envois (photos, plan). Conserve 14 jours.
#   sudo /opt/backstage/backup.sh        (lancé chaque nuit par backstage-backup.timer)
set -euo pipefail

BASE=/opt/backstage
DEST="${BACKUP_DIR:-$BASE/backups}"
STAMP=$(date +%Y%m%d-%H%M)
mkdir -p "$DEST"

# Lit DATABASE_URL (mysql://user:mdp@hôte:port/base) sans exposer le mot de passe dans la liste des processus.
set -a; . "$BASE/.env"; set +a
URL="${DATABASE_URL#mysql://}"
USERPASS="${URL%%@*}"; HOSTDB="${URL#*@}"
DB_USER="${USERPASS%%:*}"; DB_PASS="${USERPASS#*:}"
DB_HOST="${HOSTDB%%[:/]*}"; DB_NAME="${HOSTDB##*/}"; DB_NAME="${DB_NAME%%\?*}"

MYSQL_PWD="$DB_PASS" mysqldump --single-transaction --no-tablespaces -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" | gzip > "$DEST/db-$STAMP.sql.gz"
tar -czf "$DEST/uploads-$STAMP.tar.gz" -C "$BASE/data" uploads 2>/dev/null || true

find "$DEST" -type f -mtime +14 -delete
chmod 600 "$DEST"/*
echo "✓ Sauvegarde $STAMP dans $DEST"
