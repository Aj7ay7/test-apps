# Complete Move: Supabase → PostgreSQL

**This is the plan to fully leave Supabase and run the app only on PostgreSQL.**

The app currently runs on **Supabase** (Supabase Blog). The goal is to **completely move** to **PostgreSQL** (Postgres Blog): backup data from Supabase, restore into your own Postgres, point the app at Postgres, and stop using Supabase. No Supabase after migration.

---

## Table of contents

1. [Overview](#1-overview)
2. [Architecture (Before vs After)](#2-architecture-before-vs-after)
3. [The plan in short](#3-the-plan-in-short)
4. [Prerequisites](#4-prerequisites)
5. [Detailed step-by-step (single user)](#5-detailed-step-by-step-single-user)
6. [Two-Users scenario (optional)](#6-two-users-scenario-optional)
7. [Full transition phases (checklist)](#7-full-transition-phases-checklist)
8. [Commands reference](#8-commands-reference)
9. [Verification and data integrity](#9-verification-and-data-integrity)
10. [Troubleshooting](#10-troubleshooting)
11. [Rollback plan](#11-rollback-plan)
12. [Optional: Supabase Auth users](#12-optional-supabase-auth-users)
13. [Diagram](#13-diagram)
14. [Related documents](#14-related-documents)

---

## 1. Overview

| Aspect | Before (Supabase) | After (Complete move to Postgres) |
|--------|-------------------|-----------------------------------|
| **Platform** | Supabase (app + DB) | Your own stack only |
| **Database** | Supabase Postgres | Your PostgreSQL (Docker, RDS, Cloud SQL, etc.) |
| **App** | Supabase Blog (Supabase app) | Postgres Blog (same app, different DB) |
| **Connection** | Supabase URL / pooler | Direct Postgres URL |
| **Users/Roles** | Supabase roles (postgres, supabase_admin, etc.) | Your roles (e.g. postgres, optional app_user) |

**Goal:** Fully migrate off Supabase: move schema + data to PostgreSQL, run the app only on Postgres, and decommission Supabase.

**Estimated total time:** 30–90 minutes (depending on data size and whether you run a dry run first).

---

## 2. Architecture (Before vs After)

### 2.1 Current state — app on Supabase (what we leave)

```
┌─────────────────────────────────────────────────────────────┐
│  SUPABASE BLOG (current) — we move completely off this       │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Next.js App     │  │ Supabase        │                   │
│  │ (Supabase Blog) │──│ Postgres        │  ← backup from    │
│  └─────────────────┘  └────────┬───────┘     here          │
│           │                     │                            │
│           └─────────────────────┴── DATABASE_URL (Supabase) │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Target state — app on Postgres only (no Supabase)

```
┌─────────────────────────────────────────────────────────────┐
│  POSTGRES BLOG (after complete move) — no Supabase          │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Next.js App     │  │ Your PostgreSQL │                   │
│  │ (Postgres Blog) │──│ (blog-app etc)  │  ← restore here   │
│  └─────────────────┘  └─────────────────┘                   │
│           │                     │                            │
│           └─────────────────────┴── DATABASE_URL (Postgres) │
└─────────────────────────────────────────────────────────────┘
```

**After migration:** Only the Postgres stack runs; Supabase is no longer used.

---

## 3. The plan in short

1. **Backup** from Supabase Postgres → `blog.dump`
2. **Restore** `blog.dump` into your PostgreSQL (e.g. blog-app Postgres)
3. **Point** the app at the new `DATABASE_URL` (Postgres only)
4. **Run** the app as Postgres Blog; **stop** using Supabase

---

## 4. Prerequisites

### 4.1 Tools and access

| Requirement | Details | How to check |
|-------------|---------|--------------|
| **Docker** (if using containers) | Docker and Docker Compose installed | `docker --version`, `docker compose version` |
| **Supabase running** | Supabase DB (and optionally app) running so you can connect | `docker compose ps` in blog-app-supabase; container `supabase-db` or `blog-app-supabase-db` up |
| **Target Postgres** | Your Postgres (blog-app or other) reachable | `docker compose up -d postgres` in blog-app, or your RDS/Cloud SQL endpoint |
| **pg_dump / pg_restore** | Available inside Supabase container and target Postgres container (they ship with Postgres) | `docker exec <supabase-db> pg_dump --version` |
| **Disk space** | Enough for `blog.dump` (roughly same size as DB; allow 2x for safety) | `df -h` on host |

### 4.2 Project layout (this repo)

- **blog-app-supabase** – Supabase Blog app; uses Supabase Postgres. Backup is taken **from** here.
- **blog-app** – Postgres Blog app; uses plain Postgres. Restore goes **into** here.
- Both use the same Prisma schema (Post, Like); only `DATABASE_URL` differs.

### 4.3 Connection strings

- **Supabase (source):**  
  - Local container: `postgresql://postgres:postgres@localhost:5432/postgres` (host) or `postgresql://postgres:postgres@supabase-db:5432/postgres` (from app container).  
  - Supabase cloud: from Dashboard → Project Settings → Database → Connection string (URI).
- **Target Postgres:**  
  - Local (blog-app): `postgresql://postgres:postgres@localhost:5433/postgres` (if host port is 5433) or `postgresql://postgres:postgres@postgres:5432/postgres` (from app container).  
  - Replace host/port/password for RDS, Cloud SQL, etc.

---

## 5. Detailed step-by-step (single user)

Use this when you run the app as **postgres** only (simplest).

### Step 5.1: Ensure Supabase is running and has data

1. Go to the Supabase project directory:
   ```bash
   cd /path/to/blog-app-supabase
   ```
2. Start Supabase DB (and app if you want to confirm data in the UI):
   ```bash
   docker compose up -d supabase-db
   # Optional: docker compose up -d   # to run app too
   ```
3. Wait for DB to be healthy (about 10–30 seconds after first start). Check:
   ```bash
   docker compose ps
   ```
   The `supabase-db` (or `blog-app-supabase-db`) container should show “healthy”.
4. Optional: open the Supabase app (e.g. http://localhost:3000), confirm posts and likes appear. Note the approximate number of posts for later verification.

### Step 5.2: Create the backup from Supabase

1. From the **blog-app-supabase** directory, run:
   ```bash
   docker compose exec -T supabase-db pg_dump -U postgres -d postgres --no-owner --no-acl -F c -f /tmp/blog.dump
   ```
   **Flag explanation:**
   - `-U postgres` – connect as user `postgres`
   - `-d postgres` – database name
   - `--no-owner` – do not output ownership commands (avoids Supabase-specific roles)
   - `--no-acl` – do not output GRANT/REVOKE (avoids missing roles on target)
   - `-F c` – custom format (single file, supports parallel restore and selective restore)
   - `-f /tmp/blog.dump` – output file inside the container

2. Copy the dump from the container to the host:
   ```bash
   docker compose cp supabase-db:/tmp/blog.dump ./blog.dump
   ```
   If your compose service name is different (e.g. the container is named `blog-app-supabase-db`), use that service name:
   ```bash
   docker compose cp blog-app-supabase-db:/tmp/blog.dump ./blog.dump
   ```
   Or use the container name from `docker ps`:
   ```bash
   docker cp blog-app-supabase-db:/tmp/blog.dump ./blog.dump
   ```

3. Remove the file from the container (optional, saves space):
   ```bash
   docker compose exec -T supabase-db rm -f /tmp/blog.dump
   ```

4. **Verification:** Check the file exists and size is reasonable:
   ```bash
   ls -lh blog.dump
   ```

### Step 5.3: Ensure target Postgres is running (blog-app)

1. Go to the Postgres app directory:
   ```bash
   cd /path/to/blog-app
   ```
2. Start Postgres only (to avoid port conflict if Supabase app is still on 3000):
   ```bash
   docker compose up -d postgres
   ```
3. Wait for the container to be healthy (e.g. 5–10 seconds). Check:
   ```bash
   docker compose ps
   ```
   Or get the container ID/name:
   ```bash
   docker ps --filter "name=postgres" --format "{{.Names}}"
   ```
   Typical name: `blog-app-postgres-1`.

### Step 5.4: Copy dump into target Postgres container and restore

1. Copy the dump from the host into the **blog-app** Postgres container. If the dump is in blog-app-supabase, copy it to blog-app first:
   ```bash
   cp /path/to/blog-app-supabase/blog.dump /path/to/blog-app/blog.dump
   cd /path/to/blog-app
   ```
   Then:
   ```bash
   docker cp blog.dump blog-app-postgres-1:/tmp/blog.dump
   ```
   Replace `blog-app-postgres-1` with the actual container name from `docker ps` if different.

2. Run pg_restore:
   ```bash
   docker exec -i blog-app-postgres-1 pg_restore -U postgres -d postgres --no-owner --no-acl --clean --if-exists /tmp/blog.dump
   ```
   **Flag explanation:**
   - `-U postgres` – connect as `postgres`
   - `-d postgres` – target database name
   - `--no-owner` – do not set object owners (use connecting user)
   - `--no-acl` – do not restore permissions (avoids missing roles)
   - `--clean` – drop existing objects before recreating
   - `--if-exists` – use IF EXISTS when dropping (avoids errors on first run)
   **Note:** You may see warnings or notices (e.g. “role does not exist” for extensions). These are often safe to ignore when using `--no-owner`/`--no-acl`. Exit code 0 means success.

3. Remove the dump from the container:
   ```bash
   docker exec blog-app-postgres-1 rm -f /tmp/blog.dump
   ```

### Step 5.5: Verify data in target Postgres

1. Connect to the target database and check row counts:
   ```bash
   docker exec -it blog-app-postgres-1 psql -U postgres -d postgres -c "SELECT 'Post' AS table_name, COUNT(*) FROM \"Post\" UNION ALL SELECT 'Like', COUNT(*) FROM \"Like\";"
   ```
   Compare with the source (Supabase). Optional: run a similar query against the Supabase container to compare.

2. Spot-check content (example):
   ```bash
   docker exec -it blog-app-postgres-1 psql -U postgres -d postgres -c "SELECT id, title, slug FROM \"Post\" LIMIT 5;"
   ```

### Step 5.6: Point the app at Postgres and run it

1. In **blog-app**, ensure `.env` (or the environment used by the app) has:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@postgres:5432/postgres"
   ```
   For Docker Compose the service name is `postgres`; for local run (e.g. `npm run dev`) use `localhost` and the host port (e.g. `5433` if mapped):
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5433/postgres"
   ```

2. Start the app:
   ```bash
   docker compose up -d
   ```
   Or for local dev:
   ```bash
   npm run dev
   ```

3. Open the app in the browser (e.g. http://localhost:3001 for blog-app in Docker if mapped to 3001). Confirm:
   - Post list shows the same posts (or expected count).
   - Opening a post shows correct content.
   - Creating/editing a post works.
   - Likes and view counts work.

### Step 5.7: Decommission Supabase (when ready)

1. Stop the Supabase app and DB when you no longer need them:
   ```bash
   cd /path/to/blog-app-supabase
   docker compose down
   ```
2. Keep `blog.dump` in a safe place for a retention period (e.g. 30 days).
3. If using Supabase cloud: cancel or pause the project after you are confident in the new setup.

---

## 6. Two-Users scenario (optional)

Assume you want **two distinct database users** on the target Postgres:

- **User 1 – `postgres`** (superuser): used for migrations, backup/restore, and admin.
- **User 2 – `app_user`** (limited): used by the application at runtime (least privilege).

### 6.1 Why two users?

- **Security:** App runs with a role that cannot drop tables or alter schema.
- **Audit:** You can distinguish admin actions (as `postgres`) from app actions (as `app_user`).
- **Compliance:** Some policies require non-superuser application connections.

### 6.2 Step-by-step with two users

#### Phase A: Prepare target PostgreSQL

1. Create the application role and database (as superuser). Connect to the target Postgres (e.g. `docker exec -it blog-app-postgres-1 psql -U postgres -d postgres`) and run:
   ```sql
   CREATE USER app_user WITH PASSWORD 'your_secure_password';
   -- If you use a dedicated database:
   -- CREATE DATABASE myapp OWNER app_user;
   -- \c myapp
   ```

2. After restore (see Phase C below), grant privileges to `app_user`:
   ```sql
   GRANT USAGE ON SCHEMA public TO app_user;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
   ```

#### Phase B: Backup from Supabase

Same as Section 5.2: run `pg_dump` with `--no-owner --no-acl` and copy `blog.dump` out of the Supabase container.

#### Phase C: Restore into target Postgres

Same as Section 5.4: copy dump into target container and run `pg_restore` as `postgres`. Then run the `GRANT` statements above for `app_user`.

#### Phase D: Point app at app_user

Set in the app environment:
```env
DATABASE_URL="postgresql://app_user:your_secure_password@postgres:5432/postgres"
```
Restart the app and re-run the verification steps (Section 5.5–5.6).

If you prefer a **single user** for simplicity, use only `postgres` for both migrations and the app (as in Section 5).

---

## 7. Full transition phases (checklist)

### Phase 1: Pre-migration (Supabase side)

- [ ] Confirm Supabase DB and app are running and reachable.
- [ ] Document current Supabase roles and object ownership (optional).
- [ ] Ensure the app uses a single `DATABASE_URL` (no hardcoded Supabase-only URLs for core data).
- [ ] Run a **test** backup and restore to a staging or local Postgres (recommended).
- [ ] Decide: single user (`postgres`) vs two users (`postgres` + `app_user`) on target.
- [ ] Notify users or stakeholders of planned maintenance window (if applicable).

### Phase 2: Target PostgreSQL setup

- [ ] Provision Postgres (Docker, RDS, Cloud SQL, etc.).
- [ ] Create database and, if using two users, create `app_user` (see Section 6).
- [ ] Ensure the target is empty or that you are okay with `--clean --if-exists` dropping existing objects in the target DB.
- [ ] If using two users: plan to run `GRANT` statements immediately after first restore.

### Phase 3: Data migration

- [ ] Schedule a short maintenance window (optional; can do during low traffic).
- [ ] Optionally put the app in read-only or stop writes if you need a perfectly consistent snapshot.
- [ ] Run `pg_dump` from Supabase (with `--no-owner --no-acl`).
- [ ] Copy dump to host and verify file size.
- [ ] Transfer dump to target host/container (e.g. `docker cp`, SCP, S3).
- [ ] Run `pg_restore` into target DB (with `--no-owner --no-acl --clean --if-exists`).
- [ ] If using two users: run `GRANT` statements for `app_user`.
- [ ] Verify row counts and spot-check data (Section 9).

### Phase 4: Application cutover

- [ ] Update app config: set `DATABASE_URL` to target Postgres (and, if applicable, use `app_user`).
- [ ] Deploy and start the app against the new DB.
- [ ] Smoke tests: list posts, open post, create/edit post, delete post, likes, view count.
- [ ] Monitor errors and performance for a short period.

### Phase 5: Post-migration (complete move — no Supabase)

- [ ] Keep Supabase backup (`blog.dump`) for a retention period (e.g. 30 days).
- [ ] Remove Supabase `DATABASE_URL` from production; app uses only Postgres.
- [ ] Decommission Supabase (cancel plan, remove project, or keep read-only briefly if needed).
- [ ] Update runbooks and docs: app is “Postgres Blog” and runs only on PostgreSQL.

---

## 8. Commands reference

### Backup (from Supabase container)

```bash
cd /path/to/blog-app-supabase
docker compose exec -T supabase-db pg_dump -U postgres -d postgres --no-owner --no-acl -F c -f /tmp/blog.dump
docker compose cp supabase-db:/tmp/blog.dump ./blog.dump
docker compose exec -T supabase-db rm -f /tmp/blog.dump
```

### Restore (into blog-app Postgres container)

Replace `blog-app-postgres-1` with your actual container name if different.

```bash
cd /path/to/blog-app
docker cp blog.dump blog-app-postgres-1:/tmp/blog.dump
docker exec -i blog-app-postgres-1 pg_restore -U postgres -d postgres --no-owner --no-acl --clean --if-exists /tmp/blog.dump
docker exec blog-app-postgres-1 rm -f /tmp/blog.dump
```

### Restore with custom database name

If the target database is not `postgres` (e.g. `myapp`):

```bash
docker exec -i blog-app-postgres-1 pg_restore -U postgres -d myapp --no-owner --no-acl --clean --if-exists /tmp/blog.dump
```

### Getting the correct container name

From the **blog-app** directory (for restore):
```bash
docker compose ps -q postgres
```
Or list by name:
```bash
docker ps --format "{{.Names}}" | grep postgres
```

---

## 9. Verification and data integrity

### 9.1 Row-count comparison

**On Supabase (source):**
```bash
docker exec -it blog-app-supabase-db psql -U postgres -d postgres -c "SELECT 'Post' AS tbl, COUNT(*) FROM \"Post\" UNION ALL SELECT 'Like', COUNT(*) FROM \"Like\";"
```

**On target Postgres:**
```bash
docker exec -it blog-app-postgres-1 psql -U postgres -d postgres -c "SELECT 'Post' AS tbl, COUNT(*) FROM \"Post\" UNION ALL SELECT 'Like', COUNT(*) FROM \"Like\";"
```

Counts should match (or target may have more if you ran the app and created new data after restore).

### 9.2 Spot-check content

- Compare a few post IDs, titles, slugs, and excerpt lengths.
- Confirm at least one post has the expected `content` snippet.
- Confirm `Like` rows exist for posts that had likes.

Example:
```bash
docker exec -it blog-app-postgres-1 psql -U postgres -d postgres -c "SELECT id, title, slug, \"createdAt\" FROM \"Post\" ORDER BY \"createdAt\" DESC LIMIT 5;"
```

### 9.3 Application-level checks

- [ ] Homepage lists all expected posts.
- [ ] Click a post: title, content, and metadata match.
- [ ] Create a new post: it appears and is editable.
- [ ] Like button: count updates and state persists.
- [ ] View count increments on post view (if applicable).
- [ ] Delete post: post is removed and no errors.

---

## 10. Troubleshooting

| Issue | Cause | What to do |
|-------|--------|------------|
| `no such service: postgres` | Commands run from **blog-app-supabase** directory; that compose has `supabase-db`, not `postgres`. | Run restore commands from **blog-app** directory, or use the target container name directly (e.g. `blog-app-postgres-1`). |
| `must specify at least one container source` | `docker compose ps -q postgres` returned empty (wrong directory or Postgres not running). | `cd` to blog-app, run `docker compose up -d postgres`, then use the container name from `docker ps`. |
| `role "supabase_admin" does not exist` during restore | Restore was run **without** `--no-owner` or `--no-acl`. | Re-run `pg_restore` with `--no-owner --no-acl`. |
| `relation "Post" already exists` | Target DB already had tables; `--clean` might not have run or failed. | Run restore with `--clean --if-exists`. If needed, drop schema or use a fresh database. |
| App shows no posts after cutover | `DATABASE_URL` still points to Supabase, or wrong host/port. | Check `.env` and runtime env: must be the target Postgres URL. For Docker, use service name `postgres` and port `5432`; for host, use `localhost` and the mapped port (e.g. `5433`). |
| Port 5432 already in use | Supabase and blog-app both map 5432. | Use different host ports (e.g. Supabase 5432, blog-app 5433) or stop one stack. |
| pg_restore exits with non-zero | Some objects failed (e.g. extensions, comments). | Check stderr; often safe to ignore if tables and data are present. Re-run verification queries (Section 9). |

---

## 11. Rollback plan

If something goes wrong after cutover:

1. **Revert app config:** Point `DATABASE_URL` back to Supabase (if Supabase is still running and you have not destroyed it).
2. **Redeploy** or restart the app so it uses the reverted config.
3. **Investigate** the target Postgres: connectivity, permissions, logs. Fix issues (e.g. grants, wrong DB name).
4. **Re-run restore** into a fresh database or schema if needed; fix users/grants; then cut over again.
5. Keep Supabase (and a recent `blog.dump`) until you are confident in the new setup. Do not decommission Supabase until verification is complete.

---

## 12. Optional: Supabase Auth migration

If you use **Supabase Auth** (email/password, OAuth, magic link), you need to replace it when moving to Postgres. That includes:

- Choosing a new auth solution (e.g. **Auth.js**, Clerk, custom JWT) that works with your Postgres.
- Exporting users from `auth.users` and importing them into your new user store.
- Replacing sign-up/sign-in and session handling in the app.

**See the dedicated guide:** [Auth migration: Supabase Auth → Postgres-based auth](./AUTH-MIGRATION-SUPABASE-TO-POSTGRES.md). It covers options (NextAuth/Auth.js, Clerk, custom, SSO), migrating existing users, and how to handle enterprise SSO (SAML/OIDC).

The current blog-app schema does not include a `User` model; add one when you add auth.

---

## 13. Diagram (Mermaid)

```mermaid
flowchart LR
  subgraph Supabase["Supabase"]
    A[Next.js App] --> B[(Postgres)]
    B --> R1[postgres]
    B --> R2[supabase_admin]
  end

  subgraph Migration["Migration"]
    B -->|pg_dump --no-owner --no-acl| D[blog.dump]
    D -->|pg_restore| E[(Your Postgres)]
  end

  subgraph Target["Your PostgreSQL"]
    F[Next.js App] --> E
    E --> T1[postgres]
    E --> T2[app_user]
  end

  A -.->|cutover| F
```

---

## 14. Related documents

- [PRD: Complete Move from Supabase to PostgreSQL](./PRD-SUPABASE-TO-POSTGRES.md)
- [Edge Cases and Verification (99.9999% data integrity)](./EDGE-CASES-AND-VERIFICATION.md)
- [Auth migration: Supabase Auth → Postgres-based auth](./AUTH-MIGRATION-SUPABASE-TO-POSTGRES.md)
- [README](../README.md) – Backup/restore quick reference
