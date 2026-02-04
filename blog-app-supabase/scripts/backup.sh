#!/bin/sh
# Backup Supabase (blog-app-supabase) Postgres to blog.dump.
# Run from blog-app-supabase root: ./scripts/backup.sh
# Then copy blog.dump to blog-app and run blog-app/scripts/restore.sh
set -e
cd "$(dirname "$0")/.."
DUMP_FILE="${1:-blog.dump}"

echo "Backing up Supabase DB to $DUMP_FILE ..."
docker compose exec -T supabase-db pg_dump -U postgres -d postgres --no-owner --no-acl -F c -f /tmp/blog.dump
docker compose cp supabase-db:/tmp/blog.dump "$DUMP_FILE"
docker compose exec -T supabase-db rm -f /tmp/blog.dump

echo "Done. Backup saved to $DUMP_FILE"
echo "To restore in blog-app (Next.js + Postgres):"
echo "  1. cp $DUMP_FILE ../blog-app/"
echo "  2. cd ../blog-app && ./scripts/restore.sh"
