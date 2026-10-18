#!/usr/bin/env bash
# Builds Chrome and Firefox extension packages from the shared source.
# Output: extension/dist/chrome/ and extension/dist/firefox/ (unminified, reviewable).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"

rm -rf "$DIST"
for browser in chrome firefox; do
  mkdir -p "$DIST/$browser"
  cp "$ROOT/$browser/manifest.json" "$DIST/$browser/manifest.json"
  cp "$ROOT/shared/content.js" "$ROOT/shared/background.js" "$ROOT/shared/popup.html" "$ROOT/shared/popup.js" "$DIST/$browser/"
  mkdir -p "$DIST/$browser/icons"
  cp "$ROOT/shared/icons/icon16.png" "$ROOT/shared/icons/icon48.png" "$ROOT/shared/icons/icon128.png" "$DIST/$browser/icons/"
  echo "built $DIST/$browser"
done
