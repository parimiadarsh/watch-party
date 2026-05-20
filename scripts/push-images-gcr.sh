#!/usr/bin/env bash
# Build and push watch-party images to Google Container Registry (gcr.io).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT_ID="${GCP_PROJECT_ID:-${1:-}}"
TAG="${IMAGE_TAG:-latest}"
GOOGLE_CLIENT_ID="${VITE_GOOGLE_CLIENT_ID:-${GOOGLE_CLIENT_ID:-}}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "Usage: GCP_PROJECT_ID=my-project ./scripts/push-images-gcr.sh [tag]" >&2
  exit 1
fi

if [[ $# -ge 1 && "$1" != "$PROJECT_ID" ]]; then
  TAG="$1"
fi

REGISTRY="gcr.io/${PROJECT_ID}"
BACKEND_IMAGE="${REGISTRY}/watch-party-backend:${TAG}"
MIDDLEWARE_IMAGE="${REGISTRY}/watch-party-middleware:${TAG}"
FRONTEND_IMAGE="${REGISTRY}/watch-party-frontend:${TAG}"

gcloud auth configure-docker gcr.io --quiet

echo "Building backend -> ${BACKEND_IMAGE}"
docker build -t "${BACKEND_IMAGE}" ./backend

echo "Building middleware -> ${MIDDLEWARE_IMAGE}"
docker build -t "${MIDDLEWARE_IMAGE}" ./middleware

echo "Building frontend -> ${FRONTEND_IMAGE}"
docker build \
  --build-arg "VITE_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}" \
  -t "${FRONTEND_IMAGE}" \
  ./frontend

docker push "${BACKEND_IMAGE}"
docker push "${MIDDLEWARE_IMAGE}"
docker push "${FRONTEND_IMAGE}"

if [[ "${TAG}" != "latest" ]]; then
  docker tag "${BACKEND_IMAGE}" "${REGISTRY}/watch-party-backend:latest"
  docker tag "${MIDDLEWARE_IMAGE}" "${REGISTRY}/watch-party-middleware:latest"
  docker tag "${FRONTEND_IMAGE}" "${REGISTRY}/watch-party-frontend:latest"
  docker push "${REGISTRY}/watch-party-backend:latest"
  docker push "${REGISTRY}/watch-party-middleware:latest"
  docker push "${REGISTRY}/watch-party-frontend:latest"
fi

echo ""
echo "Done."
echo "  ${BACKEND_IMAGE}"
echo "  ${MIDDLEWARE_IMAGE}"
echo "  ${FRONTEND_IMAGE}"
