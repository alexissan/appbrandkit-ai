#!/usr/bin/env bash
set -euo pipefail

SERVICE="appbrandkit-openai-api-key"
ACCOUNT="alexis"

if ! command -v security >/dev/null 2>&1; then
  echo "❌ macOS security CLI not found. This script requires macOS." >&2
  exit 1
fi

OPENAI_API_KEY="$(security find-generic-password -s "$SERVICE" -a "$ACCOUNT" -w 2>/dev/null || true)"

if [[ -z "$OPENAI_API_KEY" ]]; then
  cat >&2 <<MSG
❌ No key found in Keychain for:
   service: $SERVICE
   account: $ACCOUNT

Add it once with:
security add-generic-password -U -s "$SERVICE" -a "$ACCOUNT" -w 'sk-...'
MSG
  exit 1
fi

export OPENAI_API_KEY
exec npx next dev
