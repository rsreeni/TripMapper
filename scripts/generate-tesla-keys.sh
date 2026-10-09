#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEYS_DIR="$ROOT/keys"
WELL_KNOWN="$ROOT/public/.well-known/appspecific"
PEM_NAME="com.tesla.3p.public-key.pem"

mkdir -p "$KEYS_DIR" "$WELL_KNOWN"

if [[ -f "$KEYS_DIR/private-key.pem" ]]; then
  echo "Private key already exists at keys/private-key.pem — not overwriting."
else
  openssl ecparam -name prime256v1 -genkey -noout -out "$KEYS_DIR/private-key.pem"
  echo "Wrote keys/private-key.pem"
fi

openssl ec -in "$KEYS_DIR/private-key.pem" -pubout -out "$KEYS_DIR/public-key.pem"
cp "$KEYS_DIR/public-key.pem" "$WELL_KNOWN/$PEM_NAME"

echo "Wrote $WELL_KNOWN/$PEM_NAME"
echo
echo "Keep keys/private-key.pem secret. Host the public PEM at:"
echo "  https://YOUR_DOMAIN/.well-known/appspecific/$PEM_NAME"
echo "Tesla requires HTTPS, HTTP 200 (no redirect), and a raw PEM body."
