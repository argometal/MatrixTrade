# ARGUS Email Routing — Production P1 (Final)

**Date:** 2026-07-03  
**Domain:** `argometal.dev`  
**Address:** `argus@argometal.dev`  
**Status:** Email Routing configured · Worker connected · API chain verified · real SMTP inbound pending external send

---

## Architecture

```
Internet (SMTP)
    ↓
argus@argometal.dev
    ↓
Cloudflare Email Routing (MX → route*.mx.cloudflare.net)
    ↓
Routing rule: literal match `to = argus@argometal.dev`
    ↓
Worker: argus-email-intake  (postal-mime → JSON)
    ↓
POST https://<tunnel>/api/argus/email-inbox  (Bearer ARGUS_INBOX_TOKEN)
    ↓
ARGUS Inbox  (local JSON storage via ARGUS_DATA_DIR)
```

No ARGUS UI or data model changes. MatrixTrade app code unchanged.

---

## Cloudflare zone

| Field | Value |
|-------|--------|
| Zone | `argometal.dev` |
| Zone ID | `89a2c5dfe14ed90d4968162c3f98e2ee` |
| Status | **active** |
| Nameservers | `ivy.ns.cloudflare.com`, `koa.ns.cloudflare.com` |
| Account ID | `3ffd6f47bd13eb74b21db7fc35734dda` |

---

## DNS records (Email Routing only)

Created by `POST /zones/{zone_id}/email/routing/dns` (also: `npx tsx tools/setup-argus-email-routing.ts`).

| Type | Name | Priority | Content |
|------|------|----------|---------|
| MX | `argometal.dev` | 76 | `route1.mx.cloudflare.net` |
| MX | `argometal.dev` | 59 | `route2.mx.cloudflare.net` |
| MX | `argometal.dev` | 2 | `route3.mx.cloudflare.net` |
| TXT | `argometal.dev` | — | `v=spf1 include:_spf.mx.cloudflare.net ~all` |
| TXT | `cf2024-1._domainkey.argometal.dev` | — | DKIM public key (managed by Cloudflare Email Routing) |

**Do not add** extra MX, SPF, or DKIM records unless Email Routing is disabled and replaced manually.

Inspect live records:

```powershell
cd c:\Tools\MatrixTrade
npx tsx tools/cf-email-routing-dns-status.ts
```

---

## Email Routing configuration

| Setting | Value |
|---------|--------|
| Enabled | `true` |
| Status | `ready` |
| Synced | `true` |

### Routing rule

| Field | Value |
|-------|--------|
| Rule ID | `ef24499096f14e53a1c7e2b6c6603b22` |
| Name | `ARGUS intake → argus-email-intake` |
| Matcher | `to` = `argus@argometal.dev` (literal) |
| Action | **Send to Worker** → `argus-email-intake` |
| Enabled | `true` |
| Priority | `0` |

Default catch-all drop rule (disabled, priority max) is normal.

Setup / idempotent re-run:

```powershell
npx tsx tools/setup-argus-email-routing.ts
```

Inspect rules:

```powershell
npx tsx tools/cf-inspect-email-routing.ts
```

---

## Worker configuration

| Field | Value |
|-------|--------|
| Worker name | `argus-email-intake` |
| Source | `argus-email-bridge/src/index.ts` |
| Version (2026-07-03) | `436acd21-cf93-494e-862e-c0ed931a8e25` |
| HTTP URL | none (`workers_dev = false`; email handler only) |

### Secrets

| Secret | Purpose | Current value |
|--------|---------|---------------|
| `ARGUS_INBOX_TOKEN` | Bearer token for intake API | Same as `.env.local` → `local-inbox-token-change-me` |
| `ARGUS_INTAKE_URL` | POST target | `https://investigated-used-develops-sight.trycloudflare.com/api/argus/email-inbox` |

Redeploy secrets + Worker (no code replace):

```powershell
npx tsx tools/deploy-argus-email-worker.ts https://investigated-used-develops-sight.trycloudflare.com/api/argus/email-inbox
```

Tail inbound email processing:

```powershell
cd argus-email-bridge
npx wrangler tail argus-email-intake --format pretty
```

---

## Local prerequisites (intake target)

1. **MatrixTrade dev server** — `http://localhost:3002` (`npm run dev`)
2. **Quick tunnel** (session URL; changes on restart):

   ```powershell
   c:\Tools\runtime\cloudflared.exe tunnel --url http://localhost:3002 --no-autoupdate
   ```

3. **`.env.local`** must include `ARGUS_INBOX_TOKEN` and `ARGUS_DATA_DIR` (restored after Vercel CLI overwrote local vars).

---

## Verification

### A. API chain (completed 2026-07-03)

```powershell
npx tsx tools/test-email-inbox.ts http://localhost:3002
npx tsx tools/test-email-inbox.ts https://investigated-used-develops-sight.trycloudflare.com
```

| Test | Status | inboxItemId | attachmentCount |
|------|--------|-------------|-----------------|
| Local API | **201** | `1783067229752-zpj53j8` | 1 |
| Via quick tunnel | **201** | `1783067344575-h8f74ba` | 1 |

Data written under `C:\Users\vmartinez9\ArgusData\`.

### B. Worker MIME path (completed)

```powershell
$env:NODE_PATH = "c:\Tools\MatrixTrade\argus-email-bridge\node_modules"
npx tsx tools/simulate-email-worker-intake.ts https://investigated-used-develops-sight.trycloudflare.com/api/argus/email-inbox
```

### C. Real SMTP inbound (pending)

```powershell
npx tsx tools/send-real-email-test.ts
```

Attempt from this environment: **failed** — outbound TCP/25 to `route*.mx.cloudflare.net` timed out (typical ISP block).

**Manual real test:**

1. Keep dev server + quick tunnel running.
2. From Gmail/Outlook, send to **`argus@argometal.dev`** with subject + body + one attachment.
3. Run `wrangler tail argus-email-intake` — expect email handler invocation.
4. Open `http://localhost:3002/argus/inbox` — pending item with correct attachment count.

Expected fields on inbox item: `subject`, `rawText`, `from`, `to`, `receivedAt`, `attachmentIds[]`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Email never arrives | MX not propagated / wrong NS | Confirm NS = Cloudflare; `cf-email-routing-dns-status.ts` |
| Worker rejects email | Missing secrets | `deploy-argus-email-worker.ts` with current tunnel URL |
| Worker rejects: HTTP 401/503 | Token mismatch / missing `.env.local` | Align `ARGUS_INBOX_TOKEN`; restart dev server |
| Worker rejects: HTTP 5xx | Dev server down or tunnel stale | Restart `npm run dev` + cloudflared; update `ARGUS_INTAKE_URL` |
| `ARGUS intake HTTP 400` | Malformed JSON payload | Check Worker logs; verify postal-mime parse |
| Quick tunnel URL changed | Tunnel restarted | Redeploy Worker secret `ARGUS_INTAKE_URL` |
| OAuth cannot create zones | Wrangler scope | Add zone in Dashboard; use `setup-argus-email-routing.ts` for routing only |
| Port 25 send fails locally | ISP blocks outbound SMTP | Send from external mailbox (Gmail app) |

---

## Operational notes

1. **Quick tunnel is not production.** After first successful real email, create a **named Cloudflare Tunnel** with a stable hostname and update `ARGUS_INTAKE_URL`.
2. **Worker is reused** — do not deploy a replacement Worker; only update secrets and redeploy same `argus-email-intake`.
3. **No Supabase** in P1 — inbox items stay in local `ARGUS_DATA_DIR`.
4. **Re-run setup** after zone changes: `tools/setup-argus-email-routing.ts` (idempotent).
5. **Vercel CLI** can overwrite `.env.local` — keep a local backup of `ARGUS_INBOX_TOKEN` and `ARGUS_DATA_DIR`.

---

## Related

- [`argus-email-intake-p1.md`](argus-email-intake-p1.md) — P1 plan
- [`argus-email-intake-deployed.md`](argus-email-intake-deployed.md) — earlier deploy log
- [`argus-email-inbox.md`](argus-email-inbox.md) — JSON contract
- [`argus-email-bridge/README.md`](../../argus-email-bridge/README.md) — Worker source
