# Supabase cloud-first migration (Phase 0 + Phase 1)

MatrixTrade can use **Supabase** as the persistent source of truth for trades and playbooks instead of `data/trades.json`.

| Layer | Role |
|-------|------|
| **Vercel** | Main app (UI + server actions) |
| **Supabase** | Trades + playbooks (when `TRADES_STORE=supabase`) |
| **Cloudflare Worker** | AI bridge / inbox / snapshot (unchanged) |
| **PC** | Local dev; optional Obsidian vault sync |

---

## Required environment variables

### Vercel Production (cloud-first)

| Variable | Required | Description |
|----------|----------|-------------|
| `TRADES_STORE` | Yes | Set to `supabase` |
| `SUPABASE_URL` | Yes | Project URL (`https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key — **server only**, never expose to client |
| `MATRIXTRADE_PASSWORD` | Recommended | Trading auth |
| `BRIDGE_WORKER_URL` | For Sync | Worker base URL |
| `BRIDGE_WRITE_TOKEN` | For Sync | Snapshot publish |
| `BRIDGE_READ_TOKEN` | For Sync / inbox | Worker read token |

### Local development (JSON fallback)

| Variable | Default | Description |
|----------|---------|-------------|
| `TRADES_STORE` | `json` | `json` = `data/trades.json` + `data/playbooks.json` |
| `OBSIDIAN_SYNC` | enabled when vault exists | Set `false` to skip Obsidian writes |

When `TRADES_STORE=json`, Supabase vars are **not** required.

---

## Phase 0 — Schema + seed

### 1. Create tables

In Supabase → **SQL Editor**, run:

```
supabase/schema.sql
supabase/stock-case-cloud.sql   # stock profiles, evidence, scoped AI grants
```

`stock-case-cloud.sql` is required for Stock Profile Apply and **Scoped AI Grant API** on Vercel. See [building-backlog.md](../matrix/building-backlog.md).

### 2. Seed from local JSON

Ensure `data/trades.json` and `data/playbooks.json` exist locally (not committed after migration).

```bash
# .env.local must include SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
npx tsx tools/seed-supabase.ts
```

Seed is **idempotent** (`upsert` on `id`).

### 3. Validate shape parity

After seeding, confirm Supabase rows match `data/trades.json`:

```bash
npm run validate:supabase
```

Compares every persisted field per trade ID (H001, H002, …). Exit code `0` = match.

---

## Phase 1 — Storage provider

The app reads/writes through `lib/storage.ts` (unchanged public API). Internally:

- `lib/trades-store/` — `json` or `supabase` adapter
- `lib/playbooks-store/` — follows `TRADES_STORE` (supabase mode reads playbooks from DB)
- `lib/obsidian-local.ts` — Obsidian writes only when vault path exists locally

### Switch to Supabase

**.env.local** or **Vercel env**:

```env
TRADES_STORE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Redeploy (Vercel) or restart dev server.

---

## Stop committing live trade data

After seeding Supabase:

1. `data/trades.json` is **gitignored** — keep your copy local only.
2. Use `data/trades.json.example` as a template for new dev machines.
3. Untrack the file once (if it was previously committed):

```bash
git rm --cached data/trades.json
```

`data/playbooks.json` remains in git as **seed/config** (not personal trade data).

---

## Migration checklist

- [ ] Run `supabase/schema.sql`
- [ ] Set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Run `npm run seed:supabase`
- [ ] Run `npm run validate:supabase` (must exit 0)
- [ ] Set `TRADES_STORE=supabase` on Vercel
- [ ] Redeploy Vercel
- [ ] Verify: dashboard, create/close trade, review, Sync, Apply inbox
- [ ] `git rm --cached data/trades.json` (one time)
- [ ] Confirm Obsidian sync still works locally if vault present

---

## Known Phase 1 limits (intentional)

- **Inbox `analysis` proposals** append to Obsidian only; on Vercel without vault they no-op. Narrative fields on trades (`thesis`, etc.) are stored in Supabase when set via trade CRUD/review — not via analysis apply yet.
- **ARGUS** unchanged — still local `ARGUS_DATA_DIR`.
- **Worker** unchanged — snapshot/inbox protocol identical.
- **rules.json** still in repo (experiment limits, Obsidian paths).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required` | Set both vars; restart/redeploy |
| Playbook FK error on trade insert | Seed playbooks first (`seed-supabase.ts` order is correct) |
| Vercel writes “work” but revert | Still on `TRADES_STORE=json` or missing Supabase env |
| Obsidian not updating on Vercel | Expected — Obsidian is local-only |
