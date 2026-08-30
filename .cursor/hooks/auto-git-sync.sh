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
if [[ -z "$BRANCH" || "$BRANCH" == "HEAD" ]]; then
  log "WARN: unable to determine a named branch; skipping pull"
  exit 0
fi

STATUS="$(git status --porcelain=v1 --untracked-files=all 2>&1)"
if [[ $? -ne 0 ]]; then
  log "WARN: git status failed; skipping pull"
  log "$STATUS"
  exit 0
fi

if [[ -n "$STATUS" ]]; then
  log "Local changes detected; skipping pull on branch $BRANCH"
  while IFS= read -r line; do
    log "  $line"
  done <<< "$STATUS"
  exit 0
fi

log "Starting fast-forward-only pull on branch $BRANCH"
if git pull --ff-only origin "$BRANCH" >> "$LOG_FILE" 2>&1; then
  log "Fast-forward-only pull completed on origin/$BRANCH"
else
  log "WARN: fast-forward-only pull failed"
fi

exit 0
