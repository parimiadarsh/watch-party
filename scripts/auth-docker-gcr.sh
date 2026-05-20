#!/usr/bin/env bash
# Log Docker into GCR; also log into Artifact Registry host (us multi-region).
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-${1:-}}"
if [[ -z "$PROJECT_ID" ]]; then
  echo "Usage: GCP_PROJECT_ID=my-project ./scripts/auth-docker-gcr.sh" >&2
  exit 1
fi

gcloud config set project "$PROJECT_ID"
gcloud services enable artifactregistry.googleapis.com containerregistry.googleapis.com --project="$PROJECT_ID" 2>/dev/null || true

# Avoid broken credential helper leaving pulls anonymous
CONFIG="${HOME}/.docker/config.json"
if [[ -f "$CONFIG" ]] && command -v jq &>/dev/null; then
  tmp="$(mktemp)"
  jq 'if .credHelpers then .credHelpers |= del(.["gcr.io"], .["us.gcr.io"], .["eu.gcr.io"], .["asia.gcr.io"]) else . end' "$CONFIG" >"$tmp" && mv "$tmp" "$CONFIG"
fi

docker logout gcr.io 2>/dev/null || true
docker logout https://us-docker.pkg.dev 2>/dev/null || true

TOKEN="$(gcloud auth print-access-token --project="$PROJECT_ID")"
echo "$TOKEN" | docker login -u oauth2accesstoken --password-stdin https://gcr.io
echo "$TOKEN" | docker login -u oauth2accesstoken --password-stdin https://us-docker.pkg.dev

echo "OK — docker compose -f docker-compose.gcr.yml pull"
