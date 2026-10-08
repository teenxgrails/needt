#!/usr/bin/env bash
# Point one Coolify application at a prebuilt image tag, then deploy it.
#
# Images are built and pushed by CI; Coolify only pulls and restarts. Building
# on the production host is what used to starve the running site: three Node
# builds per merge on the same four cores as Postgres and the app itself.
#
# Usage: coolify-deploy-image.sh <application-uuid> <image-tag>
# Needs COOLIFY_API_URL (e.g. https://coolify.needt.app) and COOLIFY_TOKEN.
set -euo pipefail

uuid="${1:?application uuid is required}"
tag="${2:?image tag is required}"
: "${COOLIFY_API_URL:?COOLIFY_API_URL is required}"
: "${COOLIFY_TOKEN:?COOLIFY_TOKEN is required}"
api="${COOLIFY_API_URL%/}/api/v1"

call() {
  # Body to stderr for the job log; status code on stdout for the caller.
  curl --silent --show-error --retry 3 --max-time 60 \
    --output /dev/stderr --write-out '%{http_code}' \
    --header "Authorization: Bearer $COOLIFY_TOKEN" \
    --header "Content-Type: application/json" "$@"
}

status=$(call --request PATCH --data "{\"docker_registry_image_tag\":\"$tag\"}" \
  "$api/applications/$uuid")
case "$status" in
  2??) echo "Coolify application $uuid now points at tag $tag." ;;
  *)
    echo "Coolify refused to set the image tag on $uuid: HTTP $status" >&2
    exit 1
    ;;
esac

status=$(call --request GET "$api/deploy?uuid=$uuid&force=false")
case "$status" in
  2??) echo "Coolify accepted the deploy of $uuid at $tag ($status)." ;;
  *)
    echo "Coolify refused the deploy of $uuid: HTTP $status" >&2
    exit 1
    ;;
esac
