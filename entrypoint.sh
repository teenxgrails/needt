#!/bin/sh
set -eu

case "$*" in
  *worker*|*collaboration*) ;;
  *)
    if [ "${NODE_ENV:-}" = "production" ] && [ -z "${NEXTAUTH_SECRET:-}" ]; then
      echo "NEXTAUTH_SECRET is required in production" >&2
      exit 1
    fi
    ;;
esac

# Extract database connection details from DATABASE_URL
PG_HOST=$(echo "$DATABASE_URL" | sed -E 's#.*@([^:/]+).*#\1#')
PG_PORT=$(echo "$DATABASE_URL" | sed -E 's/.*:([0-9]*)\/.*/\1/')
PG_PORT=${PG_PORT:-5432}

# Wait for database to be ready
echo "Waiting for database to be ready..."
while ! nc -z "$PG_HOST" "$PG_PORT"; do
  sleep 1
done
echo "Database is ready!"

# This entrypoint is shared by the web and worker containers (same image,
# different CMD). Only the web process runs migrations: `prisma migrate
# deploy` takes a Postgres advisory lock, and when both containers race for
# it on the same release, the loser's lock-wait gets killed by the DB's
# statement_timeout and fails with P1002 instead of just waiting. See
# docs/STACK.md's deploy order, which treats migrations as a step separate
# from starting web/worker.
case "$*" in
  *worker*|*collaboration*)
    echo "Runtime process detected ($*); skipping migrations (web container runs them)."
    ;;
  *)
    # The client is generated during the image build. At runtime, use only
    # the lockfile-pinned Prisma CLI shipped in the image; never let npx
    # download a different major version while the container is starting.
    PRISMA_BIN="/app/node_modules/.bin/prisma"
    if [ ! -x "$PRISMA_BIN" ]; then
      echo "Bundled Prisma CLI is missing at $PRISMA_BIN" >&2
      exit 1
    fi

    echo "Running database migrations with bundled Prisma CLI..."
    "$PRISMA_BIN" migrate deploy
    ;;
esac

# Start the application
echo "Starting the application..."
exec "$@"
