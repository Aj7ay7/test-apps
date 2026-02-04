#!/bin/sh
# 1. Add all blogs to Supabase (seed)
# 2. Backup Supabase DB
# 3. Restore into blog-app (Next + Postgres) and run it
# 4. You can then open http://localhost:3000 and verify all posts
#
# Run from blog-app-supabase root: ./scripts/seed-backup-restore-and-test.sh
# Requires: blog-app at ../blog-app
set -e
SCRIPT_DIR="$(dirname "$0")"
SUPABASE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BLOG_APP_ROOT="$(cd "$SUPABASE_ROOT/../blog-app" && pwd)"
DUMP_FILE="$SUPABASE_ROOT/blog.dump"

echo "=== 1. Ensure Supabase (blog-app-supabase) is running ==="
cd "$SUPABASE_ROOT"
docker compose up -d supabase-db
echo "Waiting for DB to be healthy..."
sleep 8
docker compose up -d app 2>/dev/null || true
sleep 5

echo ""
echo "=== 2. Seed all blogs into Supabase ==="
cd "$SUPABASE_ROOT"
npm run db:seed:docker

echo ""
echo "=== 3. Backup Supabase DB to blog.dump ==="
"$SUPABASE_ROOT/scripts/backup.sh" "$DUMP_FILE"

echo ""
echo "=== 4. Stop Supabase app so port 3000 is free for blog-app ==="
docker compose stop app 2>/dev/null || true

echo ""
echo "=== 5. Restore into blog-app (Next + Postgres) and start it ==="
cd "$BLOG_APP_ROOT"
docker compose up -d postgres
echo "Waiting for Postgres to be ready..."
sleep 6
cp "$DUMP_FILE" "$BLOG_APP_ROOT/blog.dump"
./scripts/restore.sh blog.dump
docker compose up -d

echo ""
echo "=== Done ==="
echo "Blog app (Next + Postgres) is running at: http://localhost:3000"
echo "Open it and verify all posts are there."
echo ""
echo "To run Supabase app again later: cd $SUPABASE_ROOT && docker compose up -d"
