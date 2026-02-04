#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "Waiting for PostgreSQL..."
  sleep 3

  echo "Applying schema (prisma db push)..."
  while ! cd /app/db-tools && npx prisma db push --accept-data-loss --skip-generate; do
    echo "Schema apply failed or Postgres not ready, retrying in 3s..."
    sleep 3
  done

  echo "Seeding (idempotent)..."
  (cd /app/db-tools && npx prisma db seed) || true
fi

echo "Starting Next.js..."
cd /app && exec node server.js
