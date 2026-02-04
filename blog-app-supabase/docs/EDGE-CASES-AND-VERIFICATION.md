# Edge Cases and Verification: Supabase → PostgreSQL (99.9999% Data Integrity)

This document lists **edge cases** to check and **verification steps** to ensure virtually all data is preserved when moving from Supabase to Postgres. Use it together with the [Transition Plan](./TRANSITION-PLAN-SUPABASE-TO-POSTGRES.md).

---

## Table of contents

1. [Overview](#1-overview)
2. [Pre-migration: source (Supabase) checks](#2-pre-migration-source-supabase-checks)
3. [Backup edge cases](#3-backup-edge-cases)
4. [Restore edge cases](#4-restore-edge-cases)
5. [Schema edge cases](#5-schema-edge-cases)
6. [Data edge cases (by type and value)](#6-data-edge-cases-by-type-and-value)
7. [Referential integrity and ordering](#7-referential-integrity-and-ordering)
8. [Verification procedure (99.9999% confidence)](#8-verification-procedure-999999-confidence)
9. [SQL verification scripts](#9-sql-verification-scripts)
10. [Checklist summary](#10-checklist-summary)

---

## 1. Overview

**Goal:** Ensure 99.9999% of data is present and correct after migration. That means:

- Every table that exists in source exists in target with same structure.
- Row counts match (or target ≥ source for tables you might have written to after backup).
- Critical columns (IDs, FKs, unique keys, content) are identical where expected.
- No silent truncation, encoding corruption, or type coercion errors.
- Application behaviour is unchanged (read/write, constraints, indexes).

**Approach:** Check edge cases **before** backup (source health), **during** backup/restore (consistency, errors), and **after** restore (schema, row counts, checksums, spot checks, full comparison where feasible).

---

## 2. Pre-migration: source (Supabase) checks

Run these **before** taking the backup so you know the source state and can compare later.

| # | Edge case | Why it matters | What to check |
|---|-----------|----------------|----------------|
| 2.1 | **Source DB is reachable and not corrupt** | Unreachable or corrupt DB can lead to failed or partial backup. | Connect to Supabase, run `SELECT 1;`. Check Postgres logs for errors. |
| 2.2 | **No long-running or stuck transactions** | Very old transactions can cause bloat or inconsistent snapshot. | `SELECT * FROM pg_stat_activity WHERE state != 'idle' AND query_start < now() - interval '10 min';` — investigate long-running queries. |
| 2.3 | **Replication lag (if Supabase uses replicas)** | If backup is from a replica, lag can mean missing recent rows. | Prefer backup from primary. If using read replica, note the lag and consider a second backup after cutover for delta. |
| 2.4 | **Exact list of tables and schemas** | Restore might create only public schema; custom schemas or tables could be missed. | `SELECT schemaname, tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1,2;` — document list. |
| 2.5 | **Row counts and approximate size** | Baseline for post-restore comparison; large tables need more verification. | Run row counts per table (see Section 9). Note total table sizes: `SELECT pg_size_pretty(pg_total_relation_size('"Post"'));` and same for `"Like"`. |
| 2.6 | **Encoding and locale** | Mismatch can corrupt non-ASCII text. | `SHOW server_encoding;` and `SHOW lc_collate;` — ideally match on target or use UTF-8. |
| 2.7 | **Extensions in use** | Some objects depend on extensions; target may not have them. | `SELECT * FROM pg_extension;` — note which are used by your schema (e.g. uuid-ossp). Our schema uses only standard types; if you add extensions, ensure target has them. |

---

## 3. Backup edge cases

| # | Edge case | Why it matters | What to do |
|---|-----------|----------------|------------|
| 3.1 | **Backup during heavy writes** | Snapshot might be inconsistent across tables (e.g. Post inserted but Like not yet). | Prefer backup during low traffic, or accept single consistent snapshot (pg_dump is consistent per run). For 99.9999%, consider brief read-only or stop writes during dump. |
| 3.2 | **Partial or failed pg_dump** | Process might exit 0 but dump could be truncated (e.g. disk full). | Always check exit code of pg_dump. After dump: verify file size is non-zero and reasonable (e.g. not 0 bytes). Optionally: `pg_restore -l blog.dump` to list contents and confirm tables are present. |
| 3.3 | **Large database** | Dump might run out of disk, memory, or time. | Ensure enough disk (at least 1–2× DB size). For very large DBs, consider parallel dump (`pg_dump -j N`) and ensure target can restore. |
| 3.4 | **Custom format vs plain SQL** | We use custom format (`-F c`) for single file and flexibility. | Stick to `-F c`; verify with `pg_restore -l blog.dump` that all expected tables/objects are listed. |
| 3.5 | **Ownership and ACL** | Restore can fail if owner/ACL are included and roles don’t exist on target. | Always use `--no-owner --no-acl` for portability (already in plan). |
| 3.6 | **Compression** | Custom format is already compressed; double compression can confuse. | No need to gzip the dump unless transferring; if you do, verify after decompression. |

---

## 4. Restore edge cases

| # | Edge case | Why it matters | What to do |
|---|-----------|----------------|------------|
| 4.1 | **Wrong database or schema** | Restoring into wrong DB overwrites or mixes data. | Double-check `-d` and target host/container. Run restore in a test DB first if possible. |
| 4.2 | **Existing objects in target** | Tables might already exist (e.g. from previous Prisma migrations). | Use `--clean --if-exists` so restore drops and recreates; or restore into an empty DB/schema. Verify no critical data in target before restore. |
| 4.3 | **Restore errors or warnings** | Some errors are fatal (e.g. role missing); others are benign (e.g. comment on extension). | Capture full stderr. Treat “role does not exist” or “permission denied” for tables as fatal; fix (e.g. use --no-owner). Warnings about extensions/comments often OK. |
| 4.4 | **Partial restore** | Process might stop mid-way (e.g. disk full, connection drop). | Check exit code. After restore, run row counts and schema checks; if counts are 0 or much lower, re-run restore (e.g. into empty DB). |
| 4.5 | **Order of object restore** | Tables must exist before FKs; order is handled by pg_restore. | Default pg_restore order is correct. If you use custom order (e.g. -l), ensure dependencies are respected. |
| 4.6 | **Sequences not updated** | After restore, sequences might still be at old values; new inserts could conflict or reuse IDs in rare cases. | Run: `SELECT setval(pg_get_serial_sequence('"Post"', 'id'), (SELECT COALESCE(MAX(...), 1) FROM "Post"));` — but our IDs are CUIDs, not serials; no sequence for id. If you add serial/BIGSERIAL, reset sequences after restore. |

---

## 5. Schema edge cases

| # | Edge case | Why it matters | What to check |
|---|-----------|----------------|------------|
| 5.1 | **All tables present** | A missing table means missing data. | Compare table list: source vs target (see Section 9). For this app: `"Post"`, `"Like"` must exist. |
| 5.2 | **Column names and order** | Prisma uses quoted identifiers; case matters (`"Post"` not `post`). | `\d "Post"` and `\d "Like"` in psql on both DBs; or query `information_schema.columns` and compare. |
| 5.3 | **Column types** | Mismatch can cause truncation or runtime errors. | Compare `data_type`, `character_maximum_length`, `numeric_precision` for each column. Our schema: String→varchar/text, Int→int4, DateTime→timestamptz. |
| 5.4 | **Primary keys and unique constraints** | Missing PK/unique can break app and allow duplicates. | Check `"Post_pkey"`, `"Post_slug_key"`, `"Like_postId_fingerprint_key"`, `"Like_pkey"` (or equivalent) exist on target. |
| 5.5 | **Foreign keys** | Missing FK allows orphan rows or breaks cascades. | Check FK from `Like` to `Post` exists and ON DELETE CASCADE if required. |
| 5.6 | **Indexes** | Missing indexes affect performance, not correctness; but good to confirm. | Compare indexes on `"Post"` (e.g. slug) and `"Like"` (e.g. postId). |
| 5.7 | **Defaults** | Defaults on columns (e.g. views=0, createdAt=now()) should match. | Check column defaults in information_schema; application should behave same. |
| 5.8 | **Triggers and functions** | If you add triggers/functions later, they must be restored or recreated. | Current schema has none; if added, include in backup or document and reapply. |

---

## 6. Data edge cases (by type and value)

| # | Edge case | Why it matters | What to check |
|---|-----------|----------------|------------|
| 6.1 | **Row count per table** | Simplest integrity check; any mismatch needs investigation. | `SELECT COUNT(*) FROM "Post";` and `SELECT COUNT(*) FROM "Like";` on source (before backup) and target (after restore). Must match (or target ≥ source if you wrote to target after restore). |
| 6.2 | **NULL vs empty string** | Prisma/Postgres distinguish NULL and `''`; app might rely on one. | Our schema has no nullable string columns; if you add any, spot-check NULL/empty distribution. |
| 6.3 | **Empty or very long strings** | VarChar(600) on excerpt could truncate; Text on content could have huge values. | Spot-check a few long excerpts and long content; compare byte length or hash (see Section 9). |
| 6.4 | **Unicode and special characters** | Emoji, accents, RTL, newlines in title/excerpt/content. | Pick posts with special characters; compare in DB and in app UI. Check encoding (UTF-8) on both DBs. |
| 6.5 | **CUID format and uniqueness** | IDs must be unique and valid CUIDs for Prisma. | `SELECT id FROM "Post"` — no duplicates; format is CUID-like. Same for `"Like".id`. |
| 6.6 | **DateTime and timezone** | createdAt/updatedAt might be stored as timestamptz; restore should preserve. | Compare a few rows: `SELECT id, "createdAt", "updatedAt" FROM "Post" LIMIT 5;` source vs target. |
| 6.7 | **Integer bounds** | views is Int; ensure no overflow or negative. | Spot-check: `SELECT id, views FROM "Post" WHERE views > 0;` — values match. |
| 6.8 | **Like.postId references** | Every Like must reference an existing Post. | After restore: `SELECT COUNT(*) FROM "Like" l LEFT JOIN "Post" p ON l."postId" = p.id WHERE p.id IS NULL;` — must be 0. |
| 6.9 | **Like.fingerprint** | Unique (postId, fingerprint); no duplicate likes per post per fingerprint. | `SELECT "postId", fingerprint, COUNT(*) FROM "Like" GROUP BY 1,2 HAVING COUNT(*) > 1;` — must return 0 rows. |
| 6.10 | **Slug uniqueness** | Post slugs must be unique. | `SELECT slug, COUNT(*) FROM "Post" GROUP BY slug HAVING COUNT(*) > 1;` — must return 0 rows. |

---

## 7. Referential integrity and ordering

| # | Edge case | Why it matters | What to do |
|---|-----------|----------------|------------|
| 7.1 | **Foreign key order** | Restore creates tables then data; FK from Like to Post is satisfied if Post is populated first. | pg_restore handles order; after restore run FK check (Section 6.8). |
| 7.2 | **Cascade deletes** | ON DELETE CASCADE on Like: deleting a Post should delete its Likes. | Optional test: in a copy of the DB, delete one Post and confirm Likes for that post are gone. |
| 7.3 | **Orphan rows** | No Like should reference a non-existent Post. | Enforced by FK; verification query in 6.8 confirms no orphans. |

---

## 8. Verification procedure (99.9999% confidence)

Follow this **after** restore to achieve high confidence that (virtually) all data is there.

### Step 1: Schema verification

- [ ] List all tables in target; compare to source. For this app: `"Post"`, `"Like"` only.
- [ ] For each table: column names, types, and constraints match (use Section 9 SQL or `\d` in psql).

### Step 2: Row-count verification

- [ ] Run row counts on source (from a backup-time snapshot if possible, or current) and target.
- [ ] **Requirement:** `COUNT(*)` for `"Post"` and `"Like"` must match. If backup was taken and no writes to source after backup, target counts must equal source counts.

### Step 3: Checksum or hash verification (critical columns)

- [ ] For **Post**: compute a checksum over (id, title, slug, excerpt, content, views, createdAt, updatedAt) for each row, then aggregate (e.g. count of rows and sum of hashes, or checksum of sorted concatenation). Compare source vs target.
- [ ] For **Like**: same idea over (id, postId, fingerprint, createdAt).
- [ ] Option: export both tables to CSV (ordered by id), then `diff` or checksum the files. Any difference = investigate.

### Step 4: Spot-check by value

- [ ] Pick 5–10 posts (e.g. first, last, and random by id). For each: compare every column value between source and target.
- [ ] Pick 5–10 likes; compare id, postId, fingerprint, createdAt.
- [ ] Include at least one post with long content, one with special characters, one with many likes.

### Step 5: Application verification

- [ ] Homepage: number of posts and order match.
- [ ] Open each spot-checked post in the UI: title, content, excerpt, dates, view count match.
- [ ] Like counts per post match; like/unlike works and persists.
- [ ] Create one new post; edit and delete one post; confirm no errors and data persists.

### Step 6: Integrity constraints

- [ ] No orphan likes (query in 6.8).
- [ ] No duplicate slugs (query in 6.10).
- [ ] No duplicate (postId, fingerprint) in Like (query in 6.9).

If all steps pass, you have 99.9999% confidence that all data is present and correct.

---

## 9. SQL verification scripts

Run these on **source** (Supabase) before backup and on **target** (Postgres) after restore. Compare results.

### 9.1 Row counts and table list

```sql
-- Run on both DBs; compare output.
SELECT 'Post' AS table_name, COUNT(*) AS row_count FROM "Post"
UNION ALL
SELECT 'Like', COUNT(*) FROM "Like";
```

### 9.2 Schema: columns and types (Post)

```sql
SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'Post'
ORDER BY ordinal_position;
```

### 9.3 Schema: columns and types (Like)

```sql
SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'Like'
ORDER BY ordinal_position;
```

### 9.4 Checksum-style verification (Post) — deterministic fingerprint

```sql
-- Returns one row per Post: a hash of key columns. Compare list between source and target.
SELECT id,
  md5(
    id || '|' || title || '|' || slug || '|' || COALESCE(excerpt,'') || '|' || COALESCE(left(content, 10000), '') || '|' || views::text || '|' || "createdAt"::text || '|' || "updatedAt"::text
  ) AS row_hash
FROM "Post"
ORDER BY id;
```

(For full content, use the full `content` in the hash; for very large content, hashing a substring plus length is a compromise.)

### 9.5 Checksum-style verification (Like)

```sql
SELECT id, md5(id || '|' || "postId" || '|' || fingerprint || '|' || "createdAt"::text) AS row_hash
FROM "Like"
ORDER BY id;
```

### 9.6 Orphan likes (must be 0)

```sql
SELECT COUNT(*) AS orphan_likes
FROM "Like" l
LEFT JOIN "Post" p ON l."postId" = p.id
WHERE p.id IS NULL;
```

### 9.7 Duplicate slugs (must be 0)

```sql
SELECT slug, COUNT(*) FROM "Post" GROUP BY slug HAVING COUNT(*) > 1;
```

### 9.8 Duplicate (postId, fingerprint) (must be 0)

```sql
SELECT "postId", fingerprint, COUNT(*) FROM "Like" GROUP BY "postId", fingerprint HAVING COUNT(*) > 1;
```

### 9.9 Full row comparison (sample) — run on both DBs, diff output

```sql
-- Export to compare; use same ORDER BY on both.
COPY (
  SELECT id, title, slug, excerpt, content, views, "createdAt", "updatedAt"
  FROM "Post"
  ORDER BY id
) TO STDOUT WITH (FORMAT csv, HEADER);
```

Repeat for `"Like"` (id, postId, fingerprint, createdAt). Redirect to files and diff or checksum.

---

## 10. Checklist summary

Use this as a quick checklist; details are in the sections above.

**Before backup**

- [ ] Source DB reachable and healthy (2.1–2.3)
- [ ] Table list and row counts recorded (2.4–2.5)
- [ ] Encoding noted (2.6)
- [ ] Backup during low traffic or accepted snapshot consistency (3.1)

**Backup**

- [ ] pg_dump exits 0; file size non-zero and reasonable (3.2)
- [ ] `pg_restore -l blog.dump` shows expected tables (3.4)
- [ ] Used `--no-owner --no-acl` (3.5)

**Restore**

- [ ] Target DB correct; restore exits 0 or only acceptable warnings (4.1, 4.3, 4.4)
- [ ] Used `--clean --if-exists` if target had existing objects (4.2)

**After restore – schema**

- [ ] All tables present (5.1)
- [ ] Column names and types match (5.2–5.3)
- [ ] PKs, uniques, FKs present (5.4–5.5)

**After restore – data (99.9999%)**

- [ ] Row counts match (9.1)
- [ ] Checksum/hash comparison for Post and Like (9.4, 9.5) or full export diff (9.9)
- [ ] Spot-check 5–10 posts and 5–10 likes by value (Section 8, Step 4)
- [ ] No orphan likes (9.6); no duplicate slugs (9.7); no duplicate (postId, fingerprint) (9.8)

**After restore – application**

- [ ] Homepage, post view, create/edit/delete, likes, views work and match expected data (Section 8, Step 5)

---

## Related documents

- [Transition Plan](./TRANSITION-PLAN-SUPABASE-TO-POSTGRES.md)
- [PRD](./PRD-SUPABASE-TO-POSTGRES.md)
