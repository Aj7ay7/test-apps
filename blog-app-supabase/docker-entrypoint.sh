#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "Waiting for PostgreSQL..."
  sleep 5

  echo "Generating Prisma client (db-tools)..."
  (cd /app/db-tools && npx prisma generate --schema=./prisma/schema.prisma)

  echo "Applying schema (prisma db push)..."
  until cd /app/db-tools && npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss --skip-generate; do
    echo "Schema apply failed or Postgres not ready, retrying in 5s..."
    sleep 5
  done

  echo "Seeding (idempotent)..."
  (cd /app/db-tools && npx prisma db seed)
fi

echo "Starting Next.js..."
cd /app && exec node server.js
