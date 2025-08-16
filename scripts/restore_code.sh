#!/usr/bin/env bash
set -euo pipefail

# restore_code.sh
# Restore workspace files from a timestamped backup directory.
# Usage: ./scripts/restore_code.sh /absolute/or/relative/path/to/backups/backup_YYYYMMDD_HHMMSS
# If no argument provided, lists available backups and exits.

WORKSPACE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ "$#" -lt 1 ]; then
    echo "No backup folder provided. Available backups in $WORKSPACE_ROOT/backups:" >&2
    if [ -d "$WORKSPACE_ROOT/backups" ]; then
        ls -1 "$WORKSPACE_ROOT/backups" || true
    else
        echo "(no backups directory)" || true
    fi
    echo "" >&2
    echo "Usage: $0 /path/to/backups/backup_YYYYMMDD_HHMMSS" >&2
    exit 1
fi

BACKUP_DIR="$1"
# If relative path, make absolute relative to CWD
if [ ! -d "$BACKUP_DIR" ]; then
    # try relative to project backups dir
    if [ -d "$WORKSPACE_ROOT/backups/$BACKUP_DIR" ]; then
        BACKUP_DIR="$WORKSPACE_ROOT/backups/$BACKUP_DIR"
    else
        echo "Backup directory not found: $1" >&2
        exit 2
    fi
fi

if [ "$BACKUP_DIR" = "$WORKSPACE_ROOT" ] || [ "$BACKUP_DIR" = "$WORKSPACE_ROOT/" ]; then
    echo "Refusing to restore from workspace root." >&2
    exit 3
fi

echo "About to restore from: $BACKUP_DIR";
echo "Target workspace: $WORKSPACE_ROOT";

read -p "This will overwrite files in the workspace with files from the backup. Continue? [y/N] " yn
case "$yn" in
    [Yy]*) ;;
    *) echo "Aborted."; exit 0;;
esac

# Excludes to avoid restoring VCS and heavy folders
EXCLUDES=(--exclude ".git" --exclude "node_modules" --exclude "backups" --exclude ".DS_Store")

# Use rsync to copy backup contents into workspace, overwriting files and deleting files that no longer exist in the backup
rsync -a --delete "${EXCLUDES[@]}" "$BACKUP_DIR/" "$WORKSPACE_ROOT/"

echo "Restore complete."

# Reminder to re-run dependency installs if needed
if [ -f "$WORKSPACE_ROOT/package.json" ]; then
    echo "If dependencies changed in the backup, run 'npm install' in $WORKSPACE_ROOT";
fi
