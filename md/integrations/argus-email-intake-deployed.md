# ARGUS Email Intake — Deployed (P1)

**Date:** 2026-07-03  
**Status:** Worker deployed · tunnel active · intake verified  
**UI:** unchanged · no CaptureSheet changes · no storage migration

---

## Method

**Cloudflare Email Routing → Email Worker `argus-email-intake` → POST JSON → local MatrixTrade**

---

## Live URLs (this session)

| Component | URL |
|-----------|-----|
| **MatrixTrade local** | `http://localhost:3002` |
| **Cloudflare Tunnel** | `https://investigated-used-develops-sight.trycloudflare.com` |
| **Intake endpoint** | `https://investigated-used-develops-sight.trycloudflare.com/api/argus/email-inbox` |
| **Email Worker** | `https://argus-email-intake.argometal.workers.dev` (email handler only — not HTTP) |
| **Worker version** | `d944553a-2dce-4e9b-99bc-675eb3b6bb3a` |

> **Note:** Quick tunnel URLs change every restart. For production, use a **named Cloudflare Tunnel** and update `ARGUS_INTAKE_URL` secret.

---

## Secrets configured (Worker)

| Secret | Value |
|--------|--------|
| `ARGUS_INBOX_TOKEN` | Same as MatrixTrade `.env.local` |
| `ARGUS_INTAKE_URL` | `https://investigated-used-develops-sight.trycloudflare.com/api/argus/email-inbox` |

Set via: `npx tsx tools/deploy-argus-email-worker.ts <INTAKE_URL>`

---

## Prerequisites running

1. **MatrixTrade dev server** on port 3002 (`npm run dev`)
2. **Cloudflare tunnel** (keep terminal open):
   ```powershell
   c:\Tools\runtime\cloudflared.exe tunnel --url http://localhost:3002 --no-autoupdate
   ```
3. Copy the `https://….trycloudflare.com` URL before deploying Worker secrets.

---

## Verification (completed)

### 1. Direct API via tunnel

```powershell
npx tsx tools/test-email-inbox.ts https://investigated-used-develops-sight.trycloudflare.com
```

**Result:** `201` · `attachmentCount: 1` · `inboxItemId: 1783062049961-c7sdrp4`

### 2. Worker MIME path simulation (same code path as deployed Worker)

Simulates `postal-mime` parse → JSON → POST (identical to `argus-email-bridge/src/index.ts`):

```powershell
$env:NODE_PATH = "c:\Tools\MatrixTrade\argus-email-bridge\node_modules"
npx tsx tools/simulate-email-worker-intake.ts https://investigated-used-develops-sight.trycloudflare.com/api/argus/email-inbox
```

**Result:** `201` · `attachmentCount: 1` · `inboxItemId: 1783062260349-9dyih7q`  
**Subject:** `Worker E2E test — ARGUS intake`  
**Attachment:** `worker-test.txt`

### 3. ARGUS Inbox UI

Open: `http://localhost:3002/argus/inbox`  
Expect pending items with subjects above and attachment count in preview.

---

## Real inbound email (requires one more step)

Cloudflare account currently has **no domain zones** configured for Email Routing.

To receive real SMTP email:

1. Add your domain to Cloudflare (DNS)
2. Dashboard → **Email** → **Email Routing** → enable
3. Create address e.g. `argus@yourdomain.com`
4. Action: **Send to Worker** → `argus-email-intake`
5. Forward Gmail (or send test) to that address
6. Keep tunnel + local MatrixTrade running (or use stable tunnel URL)

Until a domain is routed, use **simulate** script above to test the full MIME → JSON → Inbox pipeline.

---

## Redeploy Worker (after tunnel URL changes)

```powershell
cd c:\Tools\MatrixTrade
npx tsx tools/deploy-argus-email-worker.ts https://YOUR-NEW-TUNNEL.trycloudflare.com/api/argus/email-inbox
```

---

## Manual curl

```bash
curl -X POST https://investigated-used-develops-sight.trycloudflare.com/api/argus/email-inbox \
  -H "Authorization: Bearer YOUR_ARGUS_INBOX_TOKEN" \
  -H "Content-Type: application/json" \
  -d @argus-email-bridge/sample-email-payload.json
```

---

## Related

- [`argus-email-intake-p1.md`](argus-email-intake-p1.md) — architecture plan
- [`argus-email-inbox.md`](argus-email-inbox.md) — JSON contract
- [`argus-email-bridge/README.md`](../../argus-email-bridge/README.md) — Worker source
