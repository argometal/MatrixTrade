# Vercel + ARGUS — production handoff (READ FIRST)

**Status:** Open production gap — auth and ARGUS behavior on Vercel do not match local.  
**Last verified:** 2026-07-02 against `https://matrix-trade-theta.vercel.app`  
**Commit on production:** `1e5a50f` (ARGUS module deployed — code is correct)

---

## Executive summary

| Symptom | Root cause | Fix |
|---------|------------|-----|
| No password on production | `MATRIXTRADE_PASSWORD` / `ARGUS_PASSWORD` **not set in Vercel** | Add env vars → Redeploy |
| “ARGUS isn’t there” | Trading lives at `/`; ARGUS at `/argus` — **no nav link** by design | Open `/argus` or `/argus/login` directly |
| ARGUS empty on Vercel | `data/argus/` is **gitignored** + Vercel has **no persistent disk** | Use local for journal; Vercel is not ARGUS host (yet) |
| Confusing URL | Deployment hash URL ≠ production domain | Use **`matrix-trade-theta.vercel.app`** |

**This is not a wrong deploy.** The right code is live. The gap is **configuration + architecture assumptions** that were never documented for Vercel.

---

## Why this did NOT happen in other Vercel projects

Other projects typically differ in one or more of these ways:

1. **Env vars set on first deploy** — passwords, API keys, `DATABASE_URL`, etc. were added in Vercel before anyone tested production.
2. **Auth always required** — many apps fail closed (500 or redirect) if secrets are missing. MatrixTrade **fails open** (see below).
3. **Single app surface** — one product at `/`. MatrixTrade is **two modules** (Trading + ARGUS) with no cross-links.
4. **Data in git** — trading `data/trades.json` is committed; ARGUS `data/argus/` is **private and gitignored**.
5. **No “local-only” module** — ARGUS was designed for **local disk** first; Vercel was documented only for **read-only trading dashboard**.

MatrixTrade combines all five edge cases. Easy to miss if you only open `/` on production.

---

## Two modules, one repo

| Module | Routes | Login | Data source | Production role |
|--------|--------|-------|-------------|-----------------|
| **Trading** | `/`, `/trades`, `/connect` | `/login` | `data/trades.json` (in git) | Read-only dashboard OK |
| **ARGUS** | `/argus/*` | `/argus/login` | `data/argus/journal.json` (gitignored) | **Not viable on Vercel v1** |

Shared only: `middleware.ts`, `lib/auth/*`, Next.js app shell. **No shared business logic.**

Legacy redirect: `/health/*` → `/argus/*` (middleware).

---

## Auth model (critical — why login “disappeared”)

Auth is **opt-in via environment variables**. If a password env var is **empty or unset**, middleware **does not run** login redirects.

### Trading

```text
MATRIXTRADE_PASSWORD set?  →  yes  →  /, /trades, /connect require cookie mt-auth
                          →  no   →  trading is PUBLIC
```

### ARGUS

```text
ARGUS_PASSWORD (or legacy HEALTH_VAULT_PASSWORD) set?  →  yes  →  /argus/* requires cookie argus-auth
                                                      →  no   →  ARGUS is PUBLIC
```

### Local vs Vercel

| Environment | Trading password | ARGUS password | Behavior |
|-------------|------------------|----------------|----------|
| Local `.env.local` | Usually set | Usually set | Login enforced |
| Vercel Production | **Not set** (verified) | **Not set** | **No login** |

Login **pages still exist** (`/login`, `/argus/login`). They are only reached when middleware redirects — which never happens without env vars.

### Private entries (ARGUS)

`ARGUS_PRIVATE_PIN` (legacy `HEALTH_VAULT_SECRET`) unlocks private entries for 1 hour via cookie `argus-private`. Optional; separate from module login.

---

## Vercel URLs (do not confuse)

| URL type | Example | Use |
|----------|---------|-----|
| **Production domain** (stable) | `https://matrix-trade-theta.vercel.app` | Bookmark this |
| **Deployment URL** (per build) | `matrix-trade-{hash}-argometals-projects.vercel.app` | Internal / share specific build only |

`-theta` suffix: `matrix-trade.vercel.app` was already taken globally on Vercel.

**Project name in Vercel:** MatrixTrade · **Git:** `argometal/MatrixTrade` · **Production branch:** `main`

---

## What production actually serves (verified)

| URL | Result |
|-----|--------|
| `/` | MatrixTrade trading dashboard (H001, P/L, ChatGPT handoff) |
| `/login` | Login form (but `/` does not redirect here without env) |
| `/argus` | ARGUS home — 0 entries (empty journal) |
| `/argus/login` | ARGUS login form |

Commit `1e5a50f` is deployed. ARGUS **is** on production; it is not shown at `/`.

---

## Data persistence matrix

| Data | Path | In git? | On Vercel? |
|------|------|---------|------------|
| Trades | `data/trades.json` | Yes | Yes (from deploy) |
| Rules | `data/rules.json` | Yes | Yes |
| ARGUS journal | `data/argus/journal.json` | **No** | **No** |
| ARGUS attachments | `data/argus/files/` | **No** | **No** |
| Obsidian vault | `vault/` | Partial / ignored | No (path wrong on serverless) |

Obsidian warning on Vercel (`Vault folder not found`) is **expected** — serverless cwd is not your PC.

---

## Fix checklist (Vercel dashboard — no code change)

1. **Settings → Environment Variables → Production**
   - `MATRIXTRADE_PASSWORD` = (your trading password)
   - `ARGUS_PASSWORD` = (your ARGUS password)
   - `ARGUS_PRIVATE_PIN` = (optional)
2. **Redeploy** latest `main` (env vars apply on new deployment only).
3. Test:
   - `/` → should redirect to `/login`
   - `/argus` → should redirect to `/argus/login`
4. Understand: ARGUS will still be **empty** on Vercel until external storage exists.

---

## Recommended production strategy

### Trading on Vercel (current — OK)

- Read-only experiment dashboard from git-backed `data/trades.json`.
- Optional password via `MATRIXTRADE_PASSWORD`.
- Stable URL: `matrix-trade-theta.vercel.app`.

### ARGUS (local first — intentional)

- **Primary:** run locally (`start.bat`), data in `data/argus/`.
- **Do not expect** Vercel to hold journal entries in v1.
- Future: Cloudflare Worker capture queue → import to local ARGUS (see prior design).

### Optional custom domain

Add under Vercel → Domains, e.g. `matrixtrade.yourdomain.com`.

---

## Code locations (ARGUS)

| Path | Purpose |
|------|---------|
| `app/argus/` | UI, routes, server actions |
| `lib/argus/types.ts` | Entry, Contact, Evidence models |
| `lib/argus/server-storage.ts` | Disk I/O + legacy `data/health-vault/` migration |
| `lib/argus/migrate.ts` | v1 Health Vault → v2 ARGUS schema |
| `middleware.ts` | Auth gates + `/health` redirects |
| `lib/auth/passwords.ts` | **Fail-open** if env empty |
| `app/api/argus/files/[id]/route.ts` | Evidence attachments |

---

## Open issues (prioritize)

| # | Issue | Severity | Owner |
|---|-------|----------|-------|
| 1 | Vercel env vars not configured | **High** — production wide open | User (Vercel dashboard) |
| 2 | Fail-open auth surprises deployers | **Medium** — doc + optional code fix | Cursor / design decision |
| 3 | ARGUS on Vercel empty + writable but non-persistent | **Medium** — misleading UX | Future: disable write on Vercel or external DB |
| 4 | No discoverability of `/argus` from trading UI | Low — intentional discretion | By design |
| 5 | Obsidian path on Vercel | Low — expected | Document only |

---

## Suggested code follow-ups (NOT implemented)

1. **Fail closed in production:** if `NODE_ENV=production` and password env missing → show setup error instead of public app.
2. **ARGUS write guard on Vercel:** detect serverless / no disk → read-only banner or block saves.
3. **Deploy checklist** in CI or README block deploy doc until env vars documented.

---

## For ChatGPT / next agent

1. Read [`CHATGPT.md`](../../CHATGPT.md) — trading + bridge phases.
2. Read **this file** before advising on Vercel or ARGUS production.
3. Do **not** assume login works on Vercel without confirming env vars.
4. Do **not** assume ARGUS data exists on production.
5. Worker bridge (`matrixtrade-bridge.argometal.workers.dev`) is separate from Vercel — unchanged.

---

## Quick commands (local)

```bat
cd c:\Tools\MatrixTrade
copy .env.local.example .env.local
:: edit passwords
start.bat
```

| URL | Module |
|-----|--------|
| `http://localhost:3000/login` | Trading |
| `http://localhost:3000/argus/login` | ARGUS |
