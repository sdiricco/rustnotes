#!/usr/bin/env bash
# Build macOS universale firmata con Developer ID e notarizzata, in locale.
# Stesse variabili d'ambiente che usa tauri-action in release.yml, cosi' quello
# che passa qui passa anche in CI.
#
# Le credenziali Apple NON stanno nel repo: vengono lette da
#   ~/.private_keys/rustnotes-notarize.env
# che deve esportare:
#   APPLE_SIGNING_IDENTITY  "Developer ID Application: Nome Cognome (TEAMID)"
#   APPLE_API_ISSUER        Issuer ID (App Store Connect > Integrazioni > API)
#   APPLE_API_KEY           Key ID della chiave API
#   APPLE_API_KEY_PATH      percorso del file AuthKey_<KeyID>.p8
#   TAURI_SIGNING_PRIVATE_KEY_PATH  chiave minisign dell'updater (firma di
#                           latest.json e degli artefatti .tar.gz/.sig)
# Il certificato deve essere nel portachiavi di login (in CI arriva come .p12).
set -euo pipefail

ENV_FILE="${APPLE_ENV_FILE:-$HOME/.private_keys/rustnotes-notarize.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi
for v in APPLE_SIGNING_IDENTITY APPLE_API_ISSUER APPLE_API_KEY APPLE_API_KEY_PATH TAURI_SIGNING_PRIVATE_KEY_PATH; do
  if [[ -z "${!v:-}" ]]; then
    echo "manca $v (vedi $ENV_FILE)" >&2
    exit 1
  fi
done
export APPLE_SIGNING_IDENTITY APPLE_API_ISSUER APPLE_API_KEY APPLE_API_KEY_PATH
export TAURI_SIGNING_PRIVATE_KEY_PATH TAURI_SIGNING_PRIVATE_KEY_PASSWORD="${TAURI_SIGNING_PRIVATE_KEY_PASSWORD:-}"

cd "$(dirname "$0")/.."
pnpm tauri build --target universal-apple-darwin

BUNDLE=src-tauri/target/universal-apple-darwin/release/bundle
APP=$(find "$BUNDLE/macos" -maxdepth 1 -name '*.app' | head -1)
DMG=$(find "$BUNDLE/dmg" -maxdepth 1 -name '*.dmg' | head -1)

echo
echo "== firma =="
codesign --verify --deep --strict --verbose=2 "$APP"
echo "== Gatekeeper =="
spctl --assess --type execute --verbose=2 "$APP"
echo "== notarizzazione stapled =="
xcrun stapler validate "$APP"
xcrun stapler validate "$DMG"
echo
echo "OK: $DMG"
