# Blog App – Next.js & PostgreSQL

A full-featured blog built with **Next.js 14** (App Router) and **PostgreSQL**, using **Prisma** as the ORM.

## Features

- **Create, edit, delete** blog posts
- **Markdown** content with **code blocks** (syntax highlighting + **copy** button)
- **Likes** per post (one per browser via fingerprint)
- **View count** per post
- **Slug** URLs (e.g. `/posts/nextjs-postgresql-getting-started`)

## What you need

- **Node.js** 18+
- **Docker & Docker Compose** (for PostgreSQL)
- **Environment**: `DATABASE_URL` in `.env`

## Quick start

### Option A: Run everything in Docker (app + Postgres)

Postgres and the app run in containers. No local Node needed.

1. **Environment** – Copy `.env.example` to `.env`. Set `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.  
   - **Either** leave `DATABASE_URL` unset (compose will build it with host `postgres`),  
   - **or** set `DATABASE_URL=postgresql://user:pass@postgres:5432/db` (host must be `postgres`, not `localhost`, so the app container can reach the DB).

2. **Start both services** (app depends on Postgres and waits for it to be healthy):

```bash
docker compose up -d --build
```

- App: [http://localhost:3001](http://localhost:3001) (or `APP_PORT` if set; add `ports: ["${APP_PORT:-3001}:3000"]` under `app` if you need host access)
- Postgres: `localhost:5433` (or `POSTGRES_PORT`; user/password from env)

On first start the app runs `prisma db push` and `prisma db seed` inside the container. If you see "Can't reach database server at postgres:5432", ensure both `postgres` and `app` are running in the same compose project (same network).

To stop: `docker compose down` (add `-v` to remove the DB volume).

### Option B: Test locally (Postgres in Docker, app on your machine)

Use this to run the Next.js app with `npm run dev` while Postgres runs in Docker.

1. **Start only Postgres**

   ```bash
   docker compose up -d postgres
   ```

2. **Environment**

   Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

   Default: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"`

3. **Install, schema, seed**

   ```bash
   npm install
   npx prisma generate
   npx prisma db push
   npm run db:seed
   ```

4. **Run the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command        | Description                |
|----------------|----------------------------|
| `npm run dev`  | Start dev server (use with Option B) |
| `npm run build`| Build (runs Prisma generate) |
| `npm run start`| Start production server    |
| `npm run db:push` | Push Prisma schema to DB |
| `npm run db:seed` | Seed first blog post (README-style) |
| `npm run db:studio` | Open Prisma Studio      |

**Docker**

| Command | Description |
|---------|-------------|
| `docker compose up -d --build` | Run app + Postgres (Option A) |
| `docker compose up -d postgres` | Run only Postgres for local dev (Option B) |
| `docker compose down` | Stop all services |

### Deploy with Dokploy

If you get **"Bind for 0.0.0.0:3000 failed: port is already allocated"**, port 3000 is in use (e.g. by another app or Dokploy). Use either:

1. **Override so the app doesn't bind a host port** (recommended): Dokploy's proxy can reach the app by service name. In Dokploy, add a compose override and use:
   ```yaml
   # docker-compose.dokploy.yml (or in Dokploy's override)
   services:
     app:
       ports: []
   ```
   Or run locally with: `docker compose -f docker-compose.yml -f docker-compose.dokploy.yml up -d`

2. **Set a free host port**: In Dokploy, set `APP_PORT` to a port that's not in use (e.g. `3002`, `3080`). Set all other env vars from `.env.example` (no secrets in repo).

### Can't reach database server at `postgres:5432`

The **app** container cannot reach the **postgres** container; both must be on the **same Docker network**. (1) Run both with Docker Compose from this directory: `docker compose up -d --build`. (2) If using Dokploy, deploy the full stack (postgres + app) in one project and set `DATABASE_URL=postgresql://user:pass@postgres:5432/db`. (3) Verify: `docker compose exec app getent hosts postgres` — if this fails, the app is not on the same network as postgres. The entrypoint now checks the DB before starting Next.js and exits with this hint if unreachable.

### 502 Bad Gateway (e.g. bakra.blog.devshifu.com)

If the site shows **502 Bad Gateway**, the reverse proxy cannot reach the app. Check: (1) **App container running** – check Dokploy/logs; if it restarts, fix `DATABASE_URL` (use `postgres:5432` inside Docker). (2) **App listens on 0.0.0.0:3000** – compose sets `HOSTNAME=0.0.0.0`, `PORT=3000`. (3) **Proxy upstream** – Dokploy must target **app** service on port **3000** (`app:3000`). (4) **Startup** – first start runs migrations; wait 30–60 s. **Logs:** `docker compose logs app` for “Ready” or Prisma/DB errors.

## Stack

- **Next.js 14** (App Router, Server Actions)
- **PostgreSQL** (via Prisma)
- **Tailwind CSS**
- **react-markdown** + **remark-gfm** + **rehype-highlight** for Markdown and code blocks

To stop: `docker compose down` (use `-v` to remove the data volume).
