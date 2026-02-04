# Product Requirements Document (PRD): Complete Move from Supabase to PostgreSQL

**Version:** 1.0  
**Status:** Approved for implementation  
**Last updated:** 2025

---

## Table of contents

1. [Summary](#1-summary)
2. [Goals and non-goals](#2-goals-and-non-goals)
3. [Users and stakeholders](#3-users-and-stakeholders)
4. [Scope](#4-scope)
5. [Assumptions and pre-conditions](#5-assumptions-and-pre-conditions)
6. [Functional requirements](#6-functional-requirements)
7. [Non-functional requirements](#7-non-functional-requirements)
8. [Success criteria and acceptance criteria](#8-success-criteria-and-acceptance-criteria)
9. [Risks and mitigation](#9-risks-and-mitigation)
10. [Dependencies](#10-dependencies)
11. [Rollback and post-migration](#11-rollback-and-post-migration)
12. [References](#12-references)

---

## 1. Summary

**We run the app on Supabase today. This plan is to completely move from Supabase to PostgreSQL.**

The app will stop using Supabase entirely. We will: (1) backup all data from Supabase Postgres, (2) restore into our own PostgreSQL, (3) run the app against that Postgres only (Postgres Blog), and (4) decommission Supabase. After the move, the app runs solely on PostgreSQL; no Supabase dependency.

---

## 2. Goals and non-goals

### Goals

- **Complete move off Supabase:** App and data run only on PostgreSQL; Supabase is no longer used.
- Move all persistent data (posts, likes, schema) from Supabase Postgres to the target PostgreSQL with **no data loss**.
- Optional: support **two database users** on the target (`postgres` + `app_user`) for least-privilege access.
- Provide a **repeatable, documented process** (backup → restore → cutover) for the full migration.
- Keep the **same application code**; only configuration (`DATABASE_URL`) changes; run the existing app as “Postgres Blog.”

### Non-goals

- Migrating Supabase Auth (if used) is out of scope for this PRD unless explicitly added later; auth migration is a separate initiative.
- Migrating Supabase Realtime, Storage, or Edge Functions is out of scope; this PRD covers **database only**.
- Changing application features or UI as part of this migration.
- Migrating other Supabase projects or databases not used by this app.

---

## 3. Users and stakeholders


| Role                  | Description                       | Need                                                                                     |
| --------------------- | --------------------------------- | ---------------------------------------------------------------------------------------- |
| **DevOps / Platform** | Runs backup, restore, and cutover | Clear steps, rollback plan, two-user (postgres + app_user) option, troubleshooting guide |
| **Backend developer** | Maintains app and schema          | Single `DATABASE_URL`, no Supabase-specific code in DB layer, verification steps         |
| **Product / Project** | Owns timeline and risk            | Minimal downtime, rollback path, documentation, success criteria                         |
| **End users**         | Use the blog                      | No visible change in behaviour; possible short maintenance window                        |


---

## 4. Scope

### In scope

- Logical backup from Supabase Postgres using `pg_dump` with `--no-owner` and `--no-acl`.
- Restore into target Postgres using `pg_restore` with the same flags, plus `--clean --if-exists` where appropriate.
- Documentation: step-by-step transition plan, PRD, architecture/flow diagram, verification and troubleshooting.
- Optional: two DB users on target (`postgres` + `app_user`) with documented `GRANT` statements.
- Scripts or explicit commands for backup and restore (e.g. in repo and in docs).
- Verification steps: row counts, spot-check content, application smoke tests.
- Rollback procedure: revert `DATABASE_URL`, redeploy, and optional re-restore.

### Out of scope

- Supabase Auth migration.
- Supabase Realtime, Storage, Edge Functions.
- Application code changes beyond configuration (e.g. no new features).
- Infrastructure provisioning automation (Postgres is assumed available; provisioning may be documented separately).
- Migration of other applications or databases.

---

## 5. Assumptions and pre-conditions

### Assumptions

- The application uses **Prisma** (or similar) with a single **DATABASE_URL** for all database access; no Supabase client is required for reading/writing the migrated data (Post, Like).
- The schema is standard PostgreSQL (e.g. Post, Like); no Supabase-only extensions or features are required for the app to function after migration.
- The target PostgreSQL is compatible with the schema (e.g. Postgres 14+); version mismatch (e.g. dumping from 15, restoring to 12) may require testing.
- One person or team has access to both the Supabase instance (or dump) and the target Postgres instance (or container).
- A short maintenance window or acceptable brief downtime during cutover is acceptable; no requirement for zero-downtime, multi-region failover in this PRD.

### Pre-conditions (before starting migration)

- Supabase database (and optionally app) is running and accessible.
- Target PostgreSQL is provisioned, running, and accessible from the host or app deployment environment.
- Sufficient disk space for the dump file (at least the size of the database; 2x recommended for safety).
- `pg_dump` and `pg_restore` are available (they are included with Postgres containers/images).
- The app’s repository or deployment pipeline allows updating `DATABASE_URL` without code change (env var or config file).

### Post-conditions (after successful migration)

- All data (posts, likes) and schema (tables, indexes, constraints) exist in the target Postgres.
- The application is configured to use only the target Postgres (`DATABASE_URL` points to it).
- The application passes the documented verification and smoke tests.
- Supabase is no longer required for running the app; it may be kept temporarily for rollback or backup retention.

---

## 6. Functional requirements


| ID  | Requirement                                                                                                                       | Priority | Notes                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------- |
| FR1 | System shall create a full logical backup of the Supabase database (schema + data) in custom format (`-F c`).                     | Must     | Enables single-file transfer and optional parallel restore.                |
| FR2 | Backup shall be portable: no owner or ACL dependencies on Supabase-specific roles.                                                | Must     | Achieved via `--no-owner --no-acl`.                                        |
| FR3 | System shall restore the backup into the target PostgreSQL database without requiring pre-creation of Supabase roles.             | Must     | Restore succeeds with only `postgres` (and optional `app_user`) on target. |
| FR4 | Target PostgreSQL may be configured with two users: one for admin/migrations, one for the application.                            | Should   | Documented in transition plan with SQL grants.                             |
| FR5 | Documentation shall include a step-by-step transition plan, including prerequisites, commands, verification, and troubleshooting. | Must     | Single source of truth for execution.                                      |
| FR6 | Documentation shall include a rollback plan (revert config, redeploy, optional re-restore).                                       | Must     | Required for safe cutover.                                                 |
| FR7 | Documentation shall include a PRD and an architecture/flow diagram.                                                               | Should   | For alignment and audit.                                                   |
| FR8 | Process shall support both container-based (Docker) and non-container Postgres (e.g. RDS, Cloud SQL) where applicable.            | Should   | Commands can be adapted for direct `pg_dump`/`pg_restore` to a host.       |


---

## 7. Non-functional requirements


| ID   | Requirement                                                                                                                                        | Priority | Notes                                                   |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------- |
| NFR1 | Backup and restore shall complete successfully for the current schema (Post, Like and related objects).                                            | Must     | No data loss; schema intact.                            |
| NFR2 | After restore, the application shall behave identically for read and write operations (posts, likes, views).                                       | Must     | Verified by smoke tests.                                |
| NFR3 | Process shall be repeatable (e.g. for staging and production, or for re-runs after a fix).                                                         | Must     | Same steps and commands can be executed again.          |
| NFR4 | Downtime during cutover shall be minimal (order of minutes, not hours).                                                                            | Should   | No requirement for zero-downtime in this PRD.           |
| NFR5 | Documentation shall be detailed enough for a person familiar with Docker and Postgres to execute the migration without prior knowledge of the app. | Should   | Prerequisites, commands, verification, troubleshooting. |
| NFR6 | Backup file shall be retainable for a defined period (e.g. 30 days) for rollback or audit.                                                         | Should   | Policy decision; documented in transition plan.         |


---

## 8. Success criteria and acceptance criteria

### Success criteria (high level)

- A backup taken from Supabase restores successfully into the target Postgres (no fatal errors; tables and data present).
- Application connected to the target Postgres shows all expected posts and likes; create, edit, delete, likes, and views work as before.
- Optional: Application runs as `app_user` with only the required table/sequence grants.
- Transition plan and PRD are published; diagram is available (e.g. in docs or as image).
- Rollback steps are documented and have been reviewed (and optionally tested).

### Acceptance criteria (verification)

- **Backup:** Running the documented backup commands produces a `blog.dump` file; file size is non-zero and reasonable for the database size.
- **Restore:** Running the documented restore commands completes (exit code 0 or acceptable warnings); no fatal “role does not exist” or “permission denied” errors for core objects.
- **Row counts:** Row counts for `Post` and `Like` in the target database match (or are not less than) the source, allowing for any writes after backup.
- **Application:** Homepage lists posts; opening a post shows correct content; creating and editing a post works; like count and view count behave correctly.
- **Config:** Application runs with only `DATABASE_URL` pointing to the target Postgres; no Supabase URL required for core data.
- **Rollback:** If `DATABASE_URL` is reverted to Supabase (and Supabase is still available), the app can be run against Supabase again without code change.

---

## 9. Risks and mitigation


| Risk                                                                            | Impact | Likelihood         | Mitigation                                                                                            |
| ------------------------------------------------------------------------------- | ------ | ------------------ | ----------------------------------------------------------------------------------------------------- |
| Restore fails due to role/ACL (e.g. “role supabase_admin does not exist”)       | High   | Low if flags used  | Use `--no-owner --no-acl` on both dump and restore; document and test in staging.                     |
| Data inconsistency (e.g. backup taken while heavy writes)                       | Medium | Low for small apps | Take backup during low traffic or brief read-only window; verify row counts after restore.            |
| Wrong database or container (restore into wrong Postgres or overwrite wrong DB) | High   | Medium             | Document exact container names and DB names; use scripts or checklists; verify target before restore. |
| No rollback path (Supabase decommissioned too early)                            | High   | Medium             | Keep Supabase and a recent backup until verification is complete; document rollback steps.            |
| Application still points at Supabase after restore                              | Medium | Medium             | Explicit cutover checklist; verify `DATABASE_URL` in env and in running process.                      |
| Port or network conflict (e.g. both stacks on 5432 or 3000)                     | Low    | Low                | Document port mapping (e.g. blog-app Postgres on 5433); stop one stack during cutover if needed.      |
| pg_restore warnings (e.g. extensions, comments)                                 | Low    | Medium             | Document that some warnings are acceptable; focus on table/data presence and app behaviour.           |
| Target Postgres version much older than source                                  | Medium | Low                | Test restore in staging; use compatible Postgres versions (e.g. 14+).                                 |


---

## 10. Dependencies

- **Infrastructure:** Docker (for container-based Postgres) or access to target Postgres host (e.g. RDS, Cloud SQL). Postgres client tools (`pg_dump`, `pg_restore`) are included with Postgres server images.
- **Application:** Application uses a single `DATABASE_URL` for the database; no Supabase-only client required for the data being migrated (Post, Like).
- **Access:** Permissions to run `pg_dump` on the source and `pg_restore` on the target (typically as superuser or owner of the database).
- **Documentation:** Transition plan and PRD are maintained in the repo (e.g. `docs/`) and linked from the main README.

---

## 11. Rollback and post-migration

### Rollback procedure (detailed)

1. **Revert configuration:** Change `DATABASE_URL` back to the Supabase connection string (if Supabase is still running and unchanged).
2. **Redeploy or restart:** Ensure the application loads the reverted config (restart process, redeploy, or clear caches as needed).
3. **Verify:** Confirm the app connects to Supabase and data is as expected (e.g. post list and content).
4. **Investigate:** Review target Postgres logs, connectivity, and permissions to identify the cause of the failed cutover.
5. **Correct and retry (optional):** Fix target Postgres (e.g. grants, schema, or re-restore into a fresh DB), then re-run cutover when ready.

### Post-migration (after successful cutover)

- Retain `blog.dump` (and optionally a second backup from the target Postgres) for a defined retention period (e.g. 30 days).
- Remove or overwrite Supabase `DATABASE_URL` in production and runbooks so that the app is clearly “Postgres only.”
- Decommission Supabase when confident: stop containers, cancel cloud project, or keep read-only for a short period if required.
- Update runbooks, README, and any architecture docs to state that the app runs on PostgreSQL only (Postgres Blog).

---

## 12. References

- [Detailed Transition Plan: Complete Move from Supabase to PostgreSQL](./TRANSITION-PLAN-SUPABASE-TO-POSTGRES.md)
- [Edge Cases and Verification (99.9999% data integrity)](./EDGE-CASES-AND-VERIFICATION.md)
- [PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html)
- Project README: backup/restore and “Complete move from Supabase to Postgres” section

