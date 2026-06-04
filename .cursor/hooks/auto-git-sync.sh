#!/usr/bin/env bash
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="$PROJECT_ROOT/.cursor/hooks/auto-git-sync.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

cd "$PROJECT_ROOT" || {
  log "ERROR: failed to cd to $PROJECT_ROOT"
  exit 0
}

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  log "ERROR: not a git repository"
  exit 0
fi

BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || echo main)"
TIMESTAMP="$(date '+%Y-%m-%d %H:%M')"

log "Starting auto sync on branch $BRANCH"

if ! git pull origin "$BRANCH" >> "$LOG_FILE" 2>&1; then
  log "WARN: git pull failed"
fi

git add . >> "$LOG_FILE" 2>&1

if git diff --cached --quiet; then
  log "No staged changes; skipping commit and push"
  exit 0
fi

if git commit -m "auto sync: $TIMESTAMP" >> "$LOG_FILE" 2>&1; then
  log "Committed changes"
else
  log "WARN: git commit failed"
  exit 0
fi

if git push origin "$BRANCH" >> "$LOG_FILE" 2>&1; then
  log "Pushed to origin/$BRANCH"
else
  log "WARN: git push failed"
fi

exit 0
