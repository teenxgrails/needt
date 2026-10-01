#!/usr/bin/env bash
# Ask Coolify to redeploy one application.
#
# Coolify's deploy endpoint answers POST. It used to answer GET, and older
# installations still do, so a 405 falls back once rather than failing the
# release. Anything else is an error: a deploy that silently does not happen
# is worse than a red job, because the next merge then stacks on top of an
# image nobody shipped.
set -euo pipefail

hook="${1:?deploy hook URL is required}"
: "${COOLIFY_TOKEN:?COOLIFY_TOKEN is required}"

request() {
  curl --silent --show-error --retry 3 --max-time 60 \
    --output /dev/stderr --write-out '%{http_code}' \
    --request "$1" --header "Authorization: Bearer $COOLIFY_TOKEN" "$hook"
}

status=$(request POST)
if [ "$status" = "405" ]; then
  echo "Coolify rejected POST; retrying with GET for an older install." >&2
  status=$(request GET)
fi

case "$status" in
  2??) echo "Coolify accepted the deploy request ($status)." ;;
  *)
    echo "Coolify refused the deploy request: HTTP $status" >&2
    exit 1
    ;;
esac
