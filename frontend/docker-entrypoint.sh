#!/bin/sh
set -e

BACKEND_URL="${BACKEND_URL:-http://backend:8080}"
# Ensure proxy_pass target has no trailing slash
BACKEND_URL="${BACKEND_URL%/}"

sed "s|__BACKEND_URL__|${BACKEND_URL}|g" \
  /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
