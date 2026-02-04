# Migrating Authentication: Supabase Auth → Postgres-Based Auth

When you move from Supabase to your own PostgreSQL, **Supabase Auth** is no longer available. You need to replace it with an auth solution that works with your stack (Next.js + Postgres). This document outlines options and how to migrate existing users.

---

## Table of contents

1. [What you lose when leaving Supabase Auth](#1-what-you-lose-when-leaving-supabase-auth)
2. [Options for auth on Postgres](#2-options-for-auth-on-postgres)
3. [Comparison: which to choose](#3-comparison-which-to-choose)
4. [Migrating existing users from Supabase](#4-migrating-existing-users-from-supabase)
5. [SSO and enterprise auth](#5-sso-and-enterprise-auth)
6. [Recommended paths by use case](#6-recommended-paths-by-use-case)
7. [References](#7-references)

---

## 1. What you lose when leaving Supabase Auth

Supabase Auth provides:

- **Email/password** sign up and sign in
- **Magic link** (passwordless email)
- **OAuth** (Google, GitHub, etc.)
- **JWT** sessions (access + refresh)
- **User management** (auth.users, auth.sessions, etc.)
- **Row Level Security (RLS)** hooks that use Supabase JWT claims

When you move to Postgres-only:

- You **do not** get these out of the box.
- You must either:
  - **Migrate user data** from `auth.users` (and related tables) into your own DB, and
  - **Replace** sign-up/sign-in and sessions with another auth system that uses your Postgres (or an external IdP).

---

## 2. Options for auth on Postgres

You can use one of these patterns (or combine them).

### 2.1 NextAuth.js / Auth.js (recommended for Next.js + Postgres)

- **What it is:** Auth library for Next.js. Supports credentials (email/password against your DB), OAuth (Google, GitHub, etc.), and adapters that store users/sessions in **PostgreSQL**.
- **Where users live:** Your Postgres (e.g. `User`, `Account`, `Session` tables via Prisma adapter).
- **Good for:** Same stack you have (Next.js + Postgres), no vendor lock-in, full control.
- **SSO:** Supports OAuth providers; for **SAML/OIDC enterprise SSO** you typically add a provider (e.g. Keycloak, Auth0, Okta) that speaks OIDC and plug it into Auth.js as an OAuth/OIDC provider.

**Links:** [authjs.dev](https://authjs.dev), [NextAuth.js](https://next-auth.js.org)

---

### 2.2 Clerk

- **What it is:** Hosted auth service (sign-up, sign-in, user management, optional hosted UI). It can store a **copy** of user metadata in your DB via webhooks/sync, or you use only Clerk’s API and DB for sessions.
- **Where users live:** Primarily in Clerk; optionally synced to your Postgres.
- **Good for:** Fast setup, less code, built-in UI and multi-factor auth. You still move off Supabase but adopt another vendor for auth.
- **SSO:** Built-in support for Google, GitHub, etc.; **SAML/OIDC** for enterprise via Clerk’s dashboard.

**Links:** [clerk.com](https://clerk.com)

---

### 2.3 Custom JWT + Postgres (DIY)

- **What it is:** Your own API: sign-up (hash password, insert user), sign-in (verify password, issue JWT), middleware that validates JWT and loads user from Postgres.
- **Where users live:** Your Postgres only (e.g. `users` table with `id`, `email`, `password_hash`, etc.).
- **Good for:** Full control, no third-party auth service. More work (security, password hashing, refresh tokens, etc.).
- **SSO:** You integrate an external IdP (e.g. SAML/OIDC) that redirects to your app and you create or link users in your DB and issue your own JWT.

**Libraries:** bcrypt or argon2 for passwords; jose or jsonwebtoken for JWT.

---

### 2.4 Auth0 / Okta / Keycloak (identity platforms)

- **What it is:** Dedicated identity providers. Users live in their system; your app validates tokens (JWT) or uses their SDKs.
- **Where users live:** In Auth0/Okta/Keycloak; you can sync to Postgres via webhooks or use only tokens.
- **Good for:** Enterprise SSO (SAML, OIDC), compliance, many identity sources. Keycloak is self-hosted; Auth0/Okta are hosted.
- **SSO:** Native SAML and OIDC.

**Links:** [Auth0](https://auth0.com), [Okta](https://okta.com), [Keycloak](https://www.keycloak.org)

---

### 2.5 Lucia (session-based, framework-agnostic)

- **What it is:** Session-based auth library (not Next.js-specific). Stores sessions in DB (e.g. Postgres); you implement sign-up/sign-in and password hashing.
- **Where users live:** Your Postgres (users + sessions tables).
- **Good for:** Lightweight, no Next.js lock-in, full control.
- **SSO:** You integrate OAuth/OIDC providers yourself or use a separate IdP.

**Links:** [lucia-auth.com](https://lucia-auth.com)

---

## 3. Comparison: which to choose

| Need | NextAuth/Auth.js | Clerk | Custom JWT + Postgres | Auth0/Okta/Keycloak |
|------|-------------------|--------|------------------------|----------------------|
| Users in **your Postgres** | ✅ (adapter) | Optional (sync) | ✅ | Optional (sync) |
| Email/password | ✅ | ✅ | ✅ (you build) | ✅ |
| OAuth (Google, GitHub) | ✅ | ✅ | You integrate | ✅ |
| **Enterprise SSO (SAML/OIDC)** | Via IdP + OIDC | ✅ (Clerk) | Via IdP | ✅ (native) |
| Self-hosted / no vendor | ✅ | ❌ (Clerk hosted) | ✅ | Keycloak ✅; Auth0/Okta ❌ |
| Easiest migration from Supabase | ✅ | ✅ | More work | ✅ |
| Cost | Free (your infra) | Free tier, then paid | Free | Varies (Keycloak free) |

**Short answer:**

- **“I want auth in my Postgres and minimal vendor”** → **NextAuth/Auth.js** with Postgres adapter (and optional OAuth/OIDC for SSO).
- **“I want the least code and don’t mind a vendor”** → **Clerk**.
- **“I need enterprise SSO (SAML/OIDC) and want to self-host”** → **Keycloak** (or another IdP) + **Auth.js** (or your app) as the app that consumes tokens.
- **“I want full control and no dependencies”** → **Custom JWT + Postgres** (or **Lucia** for a lighter DIY).

---

## 4. Migrating existing users from Supabase

If you already have users in **Supabase Auth** (`auth.users`), you need to move them into your new auth system’s store (usually your Postgres).

### 4.1 Export users from Supabase

Supabase stores users in `auth.users`. Important columns (among others):

- `id` (UUID)
- `email`
- `encrypted_password` (hashed with Supabase’s algorithm)
- `email_confirmed_at`
- `created_at`, `updated_at`
- `raw_user_meta_data`, `raw_app_meta_data`

**Option A – SQL (self-hosted or DB access):**

```sql
-- Run against Supabase DB (read-only if possible)
SELECT id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
       raw_user_meta_data, raw_app_meta_data
FROM auth.users;
```

Export to CSV or use a script to read and insert into your new schema.

**Option B – Supabase API (if you use hosted Supabase):**

- Use Admin API to list users (paginated) and export.
- [Supabase: List users](https://supabase.com/docs/reference/api/list-users)

### 4.2 Password hashes: can you reuse them?

- Supabase uses **bcrypt** (or a variant) for `encrypted_password`.
- **NextAuth/Auth.js** with Credentials provider typically expects you to verify the password yourself; you can keep using the same hash if you use the same algorithm (e.g. bcrypt) and the same salt/cost.
- **Clerk / Auth0 / Okta:** They usually do **not** import Supabase’s bcrypt hashes. You’d have to either:
  - Force password reset for migrated users, or
  - Use a “password migration” flow: first login with old hash (custom check), then re-hash and store in the new system (if the product supports it; Clerk/Auth0 often don’t).

So in practice:

- **NextAuth + your own Postgres:** Easiest: migrate `id`, `email`, `encrypted_password`, and use bcrypt compare in Credentials provider; users keep the same passwords.
- **Clerk / Auth0 / Okta:** Plan for **migrated users to reset password** (or use magic link once), unless you run a custom backend that verifies against Supabase hash and then creates the user in the new system on first login.

### 4.3 Target schema (example for NextAuth + Prisma)

You need a `User` (and optionally `Account`, `Session`) table. NextAuth Prisma adapter schema example:

```prisma
model User {
  id            String    @id @default(cuid())
  email         String?   @unique
  emailVerified DateTime?
  password      String?   // store Supabase encrypted_password here for migration
  name          String?
  image         String?
  accounts      Account[]
  sessions      Session[]
}

model Account { ... }
model Session { ... }
```

Migration steps:

1. Export from `auth.users`.
2. Map `id` → your User id (or keep UUID if your schema uses it).
3. Map `encrypted_password` → `password` (if using Credentials + bcrypt).
4. Insert into `User` (and set `emailVerified` from `email_confirmed_at`).
5. After cutover, use NextAuth Credentials provider that checks password with bcrypt against `User.password`.

(Exact column names depend on the adapter you use; see Auth.js Prisma adapter docs.)

---

## 5. SSO and enterprise auth

**SSO** usually means:

- **SAML 2.0** (enterprise IdPs: Okta, Azure AD, OneLogin, etc.)
- **OIDC** (OpenID Connect; many providers support this)

**Ways to get SSO when you’re on Postgres:**

| Approach | How it works | Best for |
|----------|--------------|----------|
| **Auth.js + OIDC provider** | Add an “OIDC” or “SAML” provider in Auth.js that points to your IdP (e.g. Keycloak, Auth0, Okta). IdP does SAML/OIDC; Auth.js gets tokens and creates/links users. | You already use Auth.js; IdP is separate. |
| **Clerk** | Configure SAML/OIDC in Clerk dashboard; Clerk handles enterprise SSO. | You’re okay using Clerk. |
| **Auth0 / Okta** | Use them as the IdP; your app just validates JWT or uses their SDK. Users live in Auth0/Okta; optional sync to Postgres. | Enterprise-first, compliance. |
| **Keycloak (self-hosted)** | Keycloak is the IdP (SAML + OIDC). Your app uses OIDC with Keycloak; you can store minimal user info in Postgres or rely on tokens. | Self-hosted, full control. |

**Custom SSO** usually means: you integrate one IdP (e.g. Keycloak, Auth0) and your app:

- Redirects to IdP for login.
- Receives a token (OIDC) or SAML assertion.
- Creates or finds a user in your Postgres and issues your own session (e.g. JWT or cookie).

So: **you don’t have to build SAML/OIDC yourself**; you use an IdP + an auth library (Auth.js, Clerk, etc.) or a custom backend that validates the IdP’s token and maps to your Postgres user.

---

## 6. Recommended paths by use case

- **“I had Supabase Auth; I’m moving to Postgres and want users in my DB”**  
  → **Auth.js (NextAuth)** with Prisma adapter + Credentials (and OAuth if needed). Migrate `auth.users` into your `User` table; reuse bcrypt passwords with a Credentials provider.

- **“I want the least code and don’t care where users live”**  
  → **Clerk**. Migrate users via CSV/API; plan one-time password reset or magic link for migrated users unless you run a custom migration path.

- **“I need enterprise SSO (SAML/OIDC) and want to self-host”**  
  → **Keycloak** (or another IdP) + **Auth.js** (or your app) using OIDC. Users in Keycloak; optionally sync minimal profile to Postgres.

- **“I want no auth vendor and full control”**  
  → **Custom JWT + Postgres** (or **Lucia**). Migrate `auth.users` into your `users` table; implement sign-in and JWT issuance yourself.

---

## 7. References

- [Auth.js (NextAuth) – Overview](https://authjs.dev)
- [NextAuth Prisma adapter](https://authjs.dev/reference/adapter/prisma)
- [Clerk – Documentation](https://clerk.com/docs)
- [Supabase Auth – User management](https://supabase.com/docs/guides/auth)
- [Keycloak – Securing apps](https://www.keycloak.org/docs/latest/securing_apps/)
- [Lucia – Overview](https://lucia-auth.com)

---

## Summary

| Question | Answer |
|----------|--------|
| **How do I move auth from Supabase to Postgres?** | Choose an auth solution (e.g. Auth.js, Clerk, custom) that uses or syncs with Postgres; export `auth.users`; import into your new user store; switch app to the new auth. |
| **What custom SSO do I need?** | You don’t build SSO yourself. You use an IdP (Keycloak, Auth0, Okta, etc.) with SAML/OIDC and plug it into Auth.js, Clerk, or your backend. |
| **Can users keep the same passwords?** | Yes, if you use Auth.js (or custom) with bcrypt and migrate `encrypted_password` from Supabase. With Clerk/Auth0/Okta, usually no; plan password reset or magic link. |
| **Best option for Next.js + Postgres?** | **Auth.js** with Postgres (Prisma) adapter and Credentials (+ OAuth/OIDC for SSO if needed). |

This doc can live alongside your [Transition Plan](./TRANSITION-PLAN-SUPABASE-TO-POSTGRES.md) for database migration; auth migration is a separate phase that you do once you have your Postgres and new auth stack in place.
