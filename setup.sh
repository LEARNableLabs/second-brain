#!/bin/bash
set -euo pipefail

BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

step() { echo -e "\n${BOLD}[$1/4]${RESET} $2"; }

EXTENSION_ID="${1:-}"

step 1 "Installing dependencies"
npm install --silent

step 2 "Building browser extension"
npm run build --workspace=extension --silent

step 3 "Creating config directory"
mkdir -p ~/.second-brain

if [ -n "$EXTENSION_ID" ]; then
  step 4 "Installing native messaging host"
  "$(dirname "$0")/pipeline/manifests/install-host.sh" "$EXTENSION_ID"
  echo -e "\n${BOLD}Done.${RESET} Restart Chrome/Comet, then run: npx second-brain --help"
else
  step 4 "Load the extension in your browser"
  echo "  1. Open chrome://extensions"
  echo "  2. Enable Developer Mode"
  echo "  3. Click Load unpacked -> select extension/.output/chrome-mv3"
  echo "  4. Copy the extension ID, then finish setup:"
  echo ""
  echo -e "     ${BOLD}./setup.sh <your-extension-id>${RESET}"
fi
