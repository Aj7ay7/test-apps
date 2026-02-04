# Blog App – Next.js & Supabase

A full-featured blog built with **Next.js 14** (App Router) and **Supabase** (PostgreSQL), using **Prisma** as the ORM.

## Features

- **Create, edit, delete** blog posts
- **Markdown** content with **code blocks** (syntax highlighting + **copy** button)
- **Likes** per post (one per browser via fingerprint)
- **View count** per post
- **Slug** URLs (e.g. `/posts/nextjs-postgresql-getting-started`)

## What you need

- **Node.js** 18+
- **Docker** (for local Supabase Postgres container) or a **Supabase** cloud project
- **Environment**: `DATABASE_URL` in `.env` (see below)

## Quick start: local Supabase container (recommended)

Uses the **Supabase Postgres** Docker image (same engine as Supabase cloud). You can backup from this DB and restore into your own Postgres app when transitioning.

1. **Start the Supabase DB and app**
   ```bash
   docker compose up -d --build
   ```
   - **Supabase DB** (Postgres): `localhost:5432` (user `postgres`, password `postgres`)
   - **App**: [http://localhost:3000](http://localhost:3000)

   On first start the app runs `prisma db push` and `prisma db seed` inside the container. The host `prisma/` folder is mounted into the container, so you can add or change seed content without rebuilding.

2. **Add new seed content (no rebuild)**  
   Edit `prisma/seed.ts`, then run:
   ```bash
   npm run db:seed:docker
   ```
   Or: `docker compose exec app sh -c 'cd /app/db-tools && npx prisma generate --schema=./prisma/schema.prisma && npx prisma db seed'`

3. **Or run the app on your machine** (DB in Docker)
   - Start only the Supabase DB: `docker compose up -d supabase-db`
   - In `.env` set: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"`
   - Then: `npm install && npx prisma generate && npx prisma db push && npm run db:seed && npm run dev`

## Quick start: Supabase cloud

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings** → **Database** → **Connection string (URI)**. Use **Transaction** (port 6543) for serverless.
3. In `.env`: `DATABASE_URL="<that-uri>"` (replace `[YOUR-PASSWORD]` with your DB password).
4. `npm install && npx prisma generate && npx prisma db push && npm run db:seed && npm run dev`

Optional: set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API) for Auth/Realtime/Storage.

## Complete move from Supabase to Postgres (transition)

**Plan:** Fully leave Supabase and run the app only on PostgreSQL. See **[docs/TRANSITION-PLAN-SUPABASE-TO-POSTGRES.md](docs/TRANSITION-PLAN-SUPABASE-TO-POSTGRES.md)** for the detailed plan, **[docs/PRD-SUPABASE-TO-POSTGRES.md](docs/PRD-SUPABASE-TO-POSTGRES.md)** for the PRD, and **[docs/EDGE-CASES-AND-VERIFICATION.md](docs/EDGE-CASES-AND-VERIFICATION.md)** for edge cases and 99.9999% data verification.

When you want to move from Supabase (local container or cloud) to **your own Postgres** (e.g. `blog-app` or production):

1. **Backup from the Supabase DB**
   - **Local container**: ensure the Supabase container is running (`docker compose up -d supabase-db`), then:
     ```bash
     docker compose exec supabase-db pg_dump -U postgres -d postgres --no-owner --no-acl -F c -f /tmp/blog.dump
     docker compose cp supabase-db:/tmp/blog.dump ./blog.dump
     ```
     Or from the host if you have `pg_dump`:
     ```bash
     pg_dump -h localhost -p 5432 -U postgres -d postgres --no-owner --no-acl -F c -f blog.dump
     ```
   - **Supabase cloud**: use Dashboard → Database → Backups, or `pg_dump` with your project’s connection string.

2. **Restore into your Postgres app**
   - Start your target Postgres (e.g. `blog-app` with `docker compose up -d postgres`), then:
     ```bash
     pg_restore -h localhost -p 5432 -U postgres -d postgres --no-owner --no-acl --clean --if-exists blog.dump
     ```
     Or with Docker:
     ```bash
     docker cp blog.dump <your-postgres-container>:/tmp/blog.dump
     docker exec -it <your-postgres-container> pg_restore -U postgres -d postgres --no-owner --no-acl --clean --if-exists /tmp/blog.dump
     ```

3. Point your Postgres app’s `DATABASE_URL` at the restored database and run the app.

## Docker: app only (Supabase cloud URL)

If `DATABASE_URL` in `.env` points to Supabase cloud, run only the app (no local DB):

```bash
docker compose -f docker-compose.supabase.yml up -d --build
```

## Scripts

| Command        | Description                |
|----------------|----------------------------|
| `npm run dev`  | Start dev server           |
| `npm run build`| Build (runs Prisma generate) |
| `npm run start`| Start production server    |
| `npm run db:push` | Push Prisma schema to DB |
| `npm run db:seed` | Seed (run locally; needs DATABASE_URL) |
| `npm run db:seed:docker` | Seed inside Docker (uses mounted `prisma/`; no rebuild) |
| `npm run db:studio` | Open Prisma Studio   |

## Stack

- **Next.js 14** (App Router, Server Actions)
- **Supabase** (PostgreSQL; local container or cloud)
- **Prisma** (ORM)
- **Tailwind CSS**
- **react-markdown** + **remark-gfm** + **rehype-highlight** for Markdown and code blocks
