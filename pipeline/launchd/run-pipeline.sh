#!/bin/bash
# Second Brain hourly pipeline runner
# Runs: export → generate → fetch → curate
# On end-of-day (11 PM), runs curate with --eod flag

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="${HOME}/.second-brain/logs"
DATE=$(date +%Y-%m-%d)
HOUR=$(date +%H)

mkdir -p "$LOG_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log "Starting pipeline run for ${DATE} (hour: ${HOUR})"

# Resolve npx path
NPX=$(command -v npx || echo "/usr/local/bin/npx")

cd "$PROJECT_DIR"

# Step 1: Export captures from extension
log "Step 1/4: Exporting captures..."
$NPX second-brain export 2>&1 || log "Export failed (extension may not be running)"

# Step 2: Generate daily note
log "Step 2/4: Generating daily note..."
$NPX second-brain generate --date "$DATE" 2>&1 || log "Generate failed"

# Step 3: Fetch content
log "Step 3/4: Fetching content..."
$NPX second-brain fetch --date "$DATE" 2>&1 || log "Fetch failed"

# Step 4: Curate with AI
if [ "$HOUR" = "23" ]; then
  log "Step 4/4: Curating (end-of-day)..."
  $NPX second-brain curate --date "$DATE" --eod 2>&1 || log "Curate failed"
else
  log "Step 4/4: Curating (incremental)..."
  $NPX second-brain curate --date "$DATE" 2>&1 || log "Curate failed"
fi

# Step 5: Send morning email digest (8 AM only)
if [ "$HOUR" = "08" ]; then
  log "Step 5: Sending morning email digest..."
  $NPX second-brain email 2>&1 || log "Email failed"
fi

log "Pipeline run complete"
