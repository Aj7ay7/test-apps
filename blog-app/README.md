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

```bash
docker compose up -d --build
```

- App: [http://localhost:3000](http://localhost:3000)
- Postgres: `localhost:5432` (user `postgres`, password `postgres`)

On first start the app runs `prisma db push` and `prisma db seed` inside the container.

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

## Stack

- **Next.js 14** (App Router, Server Actions)
- **PostgreSQL** (via Prisma)
- **Tailwind CSS**
- **react-markdown** + **remark-gfm** + **rehype-highlight** for Markdown and code blocks

To stop: `docker compose down` (use `-v` to remove the data volume).
