#!/usr/bin/env bash
# Ask Coolify to redeploy one application from its image's `main` tag.
#
# Images are built and pushed by CI; Coolify only pulls and restarts.
# Building on the production host is what used to starve the running site:
# three Node builds per merge on the same four cores as Postgres and the app.
#
# Each Coolify resource pulls `ghcr.io/teenxgrails/needt-<app>:main`. CI
# moves `main` to the release SHA when it pushes the images (and back to an
# older SHA for a rollback), so deploying needs only the token's `deploy`
# ability; changing the resource's configured tag would need `write`.
# Whether the right build came up is checked afterwards against the exact
# SHA in each service's health endpoint, never assumed.
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
