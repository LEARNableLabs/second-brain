#!/bin/bash
# Install Second Brain launchd agent for hourly processing
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLIST_SRC="${SCRIPT_DIR}/com.secondbrain.hourly.plist"
PLIST_DST="${HOME}/Library/LaunchAgents/com.secondbrain.hourly.plist"
LOG_DIR="${HOME}/.second-brain/logs"

mkdir -p "$LOG_DIR"
mkdir -p "$(dirname "$PLIST_DST")"

# Unload existing if present
if launchctl list | grep -q com.secondbrain.hourly; then
  echo "Unloading existing agent..."
  launchctl unload "$PLIST_DST" 2>/dev/null || true
fi

# Generate plist with resolved paths
sed \
  -e "s|__INSTALL_DIR__|${SCRIPT_DIR}|g" \
  -e "s|__LOG_DIR__|${LOG_DIR}|g" \
  "$PLIST_SRC" > "$PLIST_DST"

# Load agent
launchctl load "$PLIST_DST"

echo "Installed: ${PLIST_DST}"
echo "Logs: ${LOG_DIR}/second-brain.log"
echo "Pipeline runs every hour and on login."
echo ""
echo "Commands:"
echo "  launchctl unload ${PLIST_DST}   # stop"
echo "  launchctl load ${PLIST_DST}     # start"
echo "  tail -f ${LOG_DIR}/second-brain.log  # watch logs"
