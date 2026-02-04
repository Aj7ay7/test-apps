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

1. **Environment** – Copy `.env.example` to `.env`. Set `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.  
   Either leave `DATABASE_URL` unset (compose will build it with host `supabase-db`), or set `DATABASE_URL=postgresql://user:pass@supabase-db:5432/db` (host must be `supabase-db`, not `localhost`, so the app container can reach the DB).

2. **Start the Supabase DB and app** (app depends on DB and waits for it to be healthy):
   ```bash
   docker compose up -d --build
   ```
   - **Supabase DB** (Postgres): `localhost:5432` (or `POSTGRES_PORT`; user/password from env)
   - **App**: [http://localhost:3000](http://localhost:3000)

   On first start the app runs `prisma db push` and `prisma db seed` inside the container. The host `prisma/` folder is mounted so you can add or change seed content without rebuilding. If you see "Can't reach database server at supabase-db:5432", ensure both `supabase-db` and `app` are running in the same compose project (same network).

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

**Plan:** Fully leave Supabase and run the app only on PostgreSQL. See **[docs/TRANSITION-PLAN-SUPABASE-TO-POSTGRES.md](docs/TRANSITION-PLAN-SUPABASE-TO-POSTGRES.md)** for the detailed plan, **[docs/PRD-SUPABASE-TO-POSTGRES.md](docs/PRD-SUPABASE-TO-POSTGRES.md)** for the PRD, **[docs/EDGE-CASES-AND-VERIFICATION.md](docs/EDGE-CASES-AND-VERIFICATION.md)** for edge cases and 99.9999% data verification, and **[docs/AUTH-MIGRATION-SUPABASE-TO-POSTGRES.md](docs/AUTH-MIGRATION-SUPABASE-TO-POSTGRES.md)** for moving from Supabase Auth to Postgres-based auth (including SSO).

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

## Deploy with Dokploy

1. **Port conflict** – If you get "Bind for 0.0.0.0:3000 failed: port is already allocated", use the Dokploy override so the app does not bind a host port (Dokploy's proxy reaches the app by service name):
   ```yaml
   # In Dokploy, add override (e.g. docker-compose.dokploy.yml):
   services:
     app:
       ports: []
   ```
   Or run locally with: `docker compose -f docker-compose.yml -f docker-compose.dokploy.yml up -d`

2. **Environment** – In Dokploy, set `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` and either leave `DATABASE_URL` unset or set `DATABASE_URL=postgresql://user:pass@supabase-db:5432/db`. Deploy the **full stack** (supabase-db + app) in one project so they share a network.

### Can't reach database server at `supabase-db:5432`

The **app** container cannot reach the **supabase-db** container; both must be on the **same Docker network**. (1) Run both with Docker Compose: `docker compose up -d --build`. (2) In Dokploy, deploy the full stack (supabase-db + app) in one project and set `DATABASE_URL=postgresql://user:pass@supabase-db:5432/db`. (3) Verify: `docker compose exec app getent hosts supabase-db` — if this fails, the app is not on the same network. The entrypoint checks the DB before starting Next.js and exits with this hint if unreachable.

### `relation "public.Post" does not exist`

The schema was not applied. Apply it once:  
`docker compose exec app sh -c 'cd /app/db-tools && npx prisma db push --accept-data-loss --schema=prisma/schema.prisma && npx prisma db seed --schema=prisma/schema.prisma'`  
Or from the host with `DATABASE_URL` pointing at the DB: `npx prisma db push && npm run db:seed`.

### 502 Bad Gateway

If the site shows **502 Bad Gateway**, the reverse proxy cannot reach the app. Check: (1) App container running and `DATABASE_URL` uses `supabase-db:5432` inside Docker. (2) App listens on 0.0.0.0:3000 (compose sets `HOSTNAME=0.0.0.0`, `PORT=3000`). (3) Dokploy proxy targets **app** on port **3000** (`app:3000`). (4) Wait 30–60 s on first start for migrations. **Logs:** `docker compose logs app`.

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
