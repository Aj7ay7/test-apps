#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "Waiting for PostgreSQL..."
  sleep 3

  echo "Applying schema (prisma db push)..."
  while ! (cd /app/db-tools && npx prisma db push --accept-data-loss --skip-generate --schema=prisma/schema.prisma); do
    echo "Schema apply failed or Postgres not ready, retrying in 3s..."
    sleep 3
  done

  echo "Seeding (idempotent)..."
  for i in 1 2 3 4 5; do
    if (cd /app/db-tools && npx prisma db seed --schema=prisma/schema.prisma); then break; fi
    echo "Seed attempt $i failed, retrying in 3s..."
    sleep 3
  done

  echo "Checking database connection before starting app..."
  for i in 1 2 3 4 5 6 7 8 9 10; do
    if (cd /app/db-tools && echo "SELECT 1" | npx prisma db execute --stdin --schema=prisma/schema.prisma 2>/dev/null); then
      echo "Database reachable."
      break
    fi
    if [ "$i" -eq 10 ]; then
      echo "ERROR: Cannot reach database at postgres:5432 after 30s."
      echo "Ensure app and postgres run in the same Docker Compose project: docker compose up -d --build"
      exit 1
    fi
    echo "Connection check $i/10 failed, retrying in 3s..."
    sleep 3
  done
fi

echo "Starting Next.js..."
cd /app && exec node server.js
