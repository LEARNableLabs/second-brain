#!/bin/bash
set -euo pipefail

# Resolve the absolute path to the native host script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOST_PATH="$PROJECT_ROOT/pipeline/bin/native-host.js"

# Validate host script exists
if [ ! -f "$HOST_PATH" ]; then
  echo "ERROR: Native host script not found at $HOST_PATH"
  exit 1
fi

# Get extension ID from argument or prompt
EXTENSION_ID="${1:-}"
if [ -z "$EXTENSION_ID" ]; then
  echo "Usage: ./install-host.sh <chrome-extension-id>"
  echo ""
  echo "Find your extension ID:"
  echo "  1. Open chrome://extensions"
  echo "  2. Enable Developer Mode"
  echo "  3. Copy the ID under 'Second Brain Capture'"
  exit 1
fi

# Chrome native messaging host directory (macOS)
CHROME_HOST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
# Also install for Comet (Chromium-based, same directory structure)
COMET_HOST_DIR="$HOME/Library/Application Support/Comet/NativeMessagingHosts"

MANIFEST_NAME="com.second_brain.export_host.json"

# Generate manifest with actual paths
generate_manifest() {
  cat <<MANIFEST
{
  "name": "com.second_brain.export_host",
  "description": "Second Brain - Export browsing captures to local database",
  "path": "$HOST_PATH",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXTENSION_ID/"
  ]
}
MANIFEST
}

# Install for Chrome
mkdir -p "$CHROME_HOST_DIR"
generate_manifest > "$CHROME_HOST_DIR/$MANIFEST_NAME"
echo "Installed native messaging host for Chrome"
echo "  Manifest: $CHROME_HOST_DIR/$MANIFEST_NAME"

# Install for Comet (if Comet directory exists)
if [ -d "$HOME/Library/Application Support/Comet" ]; then
  mkdir -p "$COMET_HOST_DIR"
  generate_manifest > "$COMET_HOST_DIR/$MANIFEST_NAME"
  echo "Installed native messaging host for Comet"
  echo "  Manifest: $COMET_HOST_DIR/$MANIFEST_NAME"
fi

echo ""
echo "Host path: $HOST_PATH"
echo "Extension ID: $EXTENSION_ID"
echo ""
echo "Done. Restart Chrome/Comet for changes to take effect."
