#!/usr/bin/env bash
set -euo pipefail

# Registers the app domain with Tesla Fleet API in one region.
# Requires TESLA_CLIENT_ID, TESLA_CLIENT_SECRET, TESLA_FLEET_API_BASE,
# and TESLA_APP_DOMAIN (hostname only, e.g. tripmapper.example.com).

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

: "${TESLA_CLIENT_ID:?}"
: "${TESLA_CLIENT_SECRET:?}"
: "${TESLA_FLEET_API_BASE:?}"
: "${TESLA_APP_DOMAIN:?Set TESLA_APP_DOMAIN to the hostname Tesla should register, e.g. example.com}"

TOKEN_JSON="$(curl -sS --request POST \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=client_credentials' \
  --data-urlencode "client_id=$TESLA_CLIENT_ID" \
  --data-urlencode "client_secret=$TESLA_CLIENT_SECRET" \
  --data-urlencode 'scope=openid vehicle_device_data vehicle_cmds vehicle_charging_cmds vehicle_location' \
  --data-urlencode "audience=$TESLA_FLEET_API_BASE" \
  'https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token')"

ACCESS_TOKEN="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])' <<<"$TOKEN_JSON")"

echo "Registering domain $TESLA_APP_DOMAIN against $TESLA_FLEET_API_BASE"
curl -sS --request POST \
  --header "Authorization: Bearer $ACCESS_TOKEN" \
  --header "Content-Type: application/json" \
  --data "{\"domain\": \"$TESLA_APP_DOMAIN\"}" \
  "$TESLA_FLEET_API_BASE/api/1/partner_accounts"
echo
