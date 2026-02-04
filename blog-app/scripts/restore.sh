#!/bin/sh
# Restore blog.dump into blog-app Postgres.
# Start Postgres first: docker compose up -d postgres
# Run from blog-app root: ./scripts/restore.sh [path/to/blog.dump]
set -e
cd "$(dirname "$0")/.."
DUMP_FILE="${1:-blog.dump}"

if [ ! -f "$DUMP_FILE" ]; then
  echo "Error: $DUMP_FILE not found."
  echo "Copy it from blog-app-supabase (e.g. cp ../blog-app-supabase/blog.dump .) then run again."
  exit 1
fi

CONTAINER=$(docker compose ps -q postgres 2>/dev/null || true)
if [ -z "$CONTAINER" ]; then
  echo "Postgres not running. Start it with: docker compose up -d postgres"
  exit 1
fi

echo "Restoring $DUMP_FILE into blog-app Postgres..."
docker cp "$DUMP_FILE" "$CONTAINER:/tmp/blog.dump"
docker exec -i "$CONTAINER" pg_restore -U postgres -d postgres --no-owner --no-acl --clean --if-exists /tmp/blog.dump 2>/dev/null || true
docker exec "$CONTAINER" rm -f /tmp/blog.dump

echo "Done. Start the app: docker compose up -d"
echo "Then open http://localhost:3000 and verify all posts are there."
