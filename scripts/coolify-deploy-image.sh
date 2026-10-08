#!/usr/bin/env bash
# Ask Coolify to redeploy one application from the image CI pushed.
#
# Images are built and pushed by CI; Coolify only pulls and restarts.
# Building on the production host is what used to starve the running site:
# three Node builds per merge on the same four cores as Postgres and the app.
#
# Each Coolify resource builds `docker/runtime/<app>.Dockerfile`, which is
# a single `FROM ghcr.io/teenxgrails/needt-<app>:${SOURCE_COMMIT}`: Coolify
# passes the commit it deploys, so the "build" is a pull of the image CI
# pushed for that exact commit. Deploying needs only the token's `deploy`
# ability. Whether the right build came up is checked afterwards against the
# exact SHA in each service's health endpoint, never assumed.
#
# Usage: coolify-deploy-image.sh <application-uuid>
# Needs COOLIFY_API_URL (e.g. https://coolify.needt.app) and COOLIFY_TOKEN.
set -euo pipefail

uuid="${1:?application uuid is required}"
: "${COOLIFY_API_URL:?COOLIFY_API_URL is required}"
: "${COOLIFY_TOKEN:?COOLIFY_TOKEN is required}"

status=$(curl --silent --show-error --retry 3 --max-time 60 \
  --output /dev/stderr --write-out '%{http_code}' \
  --header "Authorization: Bearer $COOLIFY_TOKEN" \
  "${COOLIFY_API_URL%/}/api/v1/deploy?uuid=$uuid&force=false")

case "$status" in
  2??) echo "Coolify accepted the deploy of $uuid ($status)." ;;
  *)
    echo "Coolify refused the deploy of $uuid: HTTP $status" >&2
    exit 1
    ;;
esac
