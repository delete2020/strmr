#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$PROJECT_ROOT"

# Parse arguments for UDID
UDID=""
EXTRA_ARGS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --udid)
      UDID="$2"
      shift 2
      ;;
    *)
      EXTRA_ARGS+=("$1")
      shift
      ;;
  esac
done

echo "🔄 Running clean Expo prebuild for iOS..."
npm run prebuild -- --clean

echo "📦 Installing CocoaPods dependencies..."
npx pod-install

if [ -n "$UDID" ]; then
  echo "🚀 Launching Expo iOS run on device with UDID: $UDID..."
  if [ ${#EXTRA_ARGS[@]} -gt 0 ]; then
    npm run ios -- --device "$UDID" "${EXTRA_ARGS[@]}"
  else
    npm run ios -- --device "$UDID"
  fi
else
  echo "🚀 Launching Expo iOS run (additional args pass through)..."
  if [ ${#EXTRA_ARGS[@]} -gt 0 ]; then
    npm run ios -- "${EXTRA_ARGS[@]}"
  else
    npm run ios
  fi
fi
