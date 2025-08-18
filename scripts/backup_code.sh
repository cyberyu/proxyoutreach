#!/usr/bin/env bash
set -euo pipefail

# backup_code.sh
# Create a timestamped backup of the workspace in a 'backups' folder (by default).
# Optional first argument: destination base directory. Defaults to <workspace>/backups

# Determine workspace root (script is located in scripts/)
WORKSPACE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_BASE="${1:-$WORKSPACE_ROOT/backups}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEST_DIR="$BACKUP_BASE/backup_$TIMESTAMP"

# Excludes to avoid copying heavy or VCS files
EXCLUDES=(--exclude ".git" --exclude "node_modules" --exclude "backups" --exclude ".DS_Store" --exclude "*.csv" --exclude "*.xlsx" --exclude "*.sql")

mkdir -p "$DEST_DIR"

echo "Creating backup: $DEST_DIR"

# Use rsync to copy the workspace tree while applying excludes
rsync -a "${EXCLUDES[@]}" "$WORKSPACE_ROOT/" "$DEST_DIR/"

echo "Backup complete: $DEST_DIR"
