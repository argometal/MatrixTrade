# ARGUS Email Intake — Deployed (P1)

**Date:** 2026-07-03  
**Domain target:** `argometal.dev`  
**Status:** Worker + tunnel verified · **Email Routing pending zone activation**  
**UI:** unchanged · no CaptureSheet changes · no storage migration

---

## Summary

| Task | Status | Notes |
|------|--------|-------|
| 1. Add `argometal.dev` as Cloudflare zone | **Blocked — manual** | Wrangler OAuth lacks `zone.create`; account has **0 zones** |
| 2. Point registrar NS to Cloudflare | **Pending** | Domain still on Porkbun NS (see below) |
| 3. Enable Email Routing | **Pending** | Requires active Cloudflare zone |
| 4. Route `argus@argometal.dev` → Worker | **Pending** | Script ready: `tools/setup-argus-email-routing.ts` |
| 5. Worker `ARGUS_INTAKE_URL` | **Confirmed** | Quick tunnel URL (see below) |
| 6. `ARGUS_INBOX_TOKEN` match | **Confirmed** | `.env.local` ↔ Worker secret (redeployed 2026-07-03) |
| 7. Real test email to `argus@argometal.dev` | **Not run** | Blocked until steps 1–4 complete |
| 8. End-to-end verify (201 + inbox UI) | **Partial** | API + MIME simulation verified; real SMTP pending |
| 9. Named tunnel (next step) | **Planned** | Replace quick tunnel after real email works |

---

## Method

**Cloudflare Email Routing → Email Worker `argus-email-intake` → POST JSON → local MatrixTrade**

---

## Live URLs (this session)

| Component | URL |
|-----------|-----|
| **MatrixTrade local** | `http://localhost:3002` |
| **Cloudflare quick tunnel** | `https://investigated-used-develops-sight.trycloudflare.com` |
| **Intake endpoint** | `https://investigated-used-develops-sight.trycloudflare.com/api/argus/email-inbox` |
| **Email Worker** | `argus-email-intake` (email handler only — not HTTP) |
| **Worker version** | `cd4d3cc3-cf04-4d8e-8826-6ed3ca0a1233` |

> **Important:** Quick tunnel URLs change every restart. After real email works, migrate to a **named Cloudflare Tunnel** and update `ARGUS_INTAKE_URL`.

---

## Worker secrets (confirmed 2026-07-03)

| Secret | Value |
|--------|--------|
| `ARGUS_INBOX_TOKEN` | Same as MatrixTrade `.env.local` (`local-inbox-token-change-me`) |
| `ARGUS_INTAKE_URL` | `https://investigated-used-develops-sight.trycloudflare.com/api/argus/email-inbox` |

Set via:

```powershell
cd c:\Tools\MatrixTrade
npx tsx tools/deploy-argus-email-worker.ts https://investigated-used-develops-sight.trycloudflare.com/api/argus/email-inbox
```

`wrangler secret list` shows both secrets present on `argus-email-intake`.

---

## DNS state (2026-07-03)

**Registrar:** Porkbun  
**Current NS (public DNS):**

- `fortaleza.ns.porkbun.com`
- `curitiba.ns.porkbun.com`
- `salvador.ns.porkbun.com`
- `maceio.ns.porkbun.com`

**Cloudflare zone:** not present yet (API list empty).

After adding the zone in Cloudflare Dashboard, replace Porkbun NS with the **two Cloudflare nameservers** shown on the zone overview page. Disable DNSSEC at Porkbun first if enabled. Propagation typically 5–30 minutes.

---

## Manual steps (in progress)

### A. Cloudflare Dashboard

1. Sign in: [Add site](https://dash.cloudflare.com/?to=/:account/add-site)
2. Add **`argometal.dev`** → Free plan → Continue
3. Copy the assigned Cloudflare nameservers

### B. Porkbun

1. [Domain management](https://porkbun.com/account/domainsSpeedy) → **argometal.dev** → DNS / Nameservers
2. Replace all four Porkbun NS with Cloudflare NS
3. Wait until Cloudflare zone status = **Active**

### C. Automate Email Routing (after zone active)

```powershell
cd c:\Tools\MatrixTrade
npx tsx tools/setup-argus-email-routing.ts
```

This script:

- Enables Email Routing DNS records
- Creates rule: `argus@argometal.dev` → Worker `argus-email-intake`

Optional: set `CLOUDFLARE_API_TOKEN` with **Zone:Create** if zone creation should be API-driven.

---

## Prerequisites running

1. **MatrixTrade dev server** on port 3002 (`npm run dev`)
2. **Cloudflare quick tunnel** (keep terminal open):

   ```powershell
   c:\Tools\runtime\cloudflared.exe tunnel --url http://localhost:3002 --no-autoupdate
   ```

3. Redeploy Worker secrets if tunnel URL changes.

**Local fix applied:** `.env.local` `ARGUS_DATA_DIR` was split across two lines (`C` + `\Users\...`), causing intake failures. Corrected to `C:\Users\vmartinez9\ArgusData`. Dev server restarted.

---

## Verification completed (API path)

### 1. Direct API — local

```powershell
npx tsx tools/test-email-inbox.ts http://localhost:3002
```

**Result:** `201` · `attachmentCount: 1` · `inboxItemId: 1783065107693-wshp4lw`

### 2. Direct API — via quick tunnel

```powershell
npx tsx tools/test-email-inbox.ts https://investigated-used-develops-sight.trycloudflare.com
```

**Result:** `201` · `attachmentCount: 1` · `inboxItemId: 1783065115415-60wk6xo`

### 3. Worker MIME path simulation

Same code path as `argus-email-bridge/src/index.ts`:

```powershell
$env:NODE_PATH = "c:\Tools\MatrixTrade\argus-email-bridge\node_modules"
npx tsx tools/simulate-email-worker-intake.ts https://investigated-used-develops-sight.trycloudflare.com/api/argus/email-inbox
```

**Result:** `201` · `attachmentCount: 1` · `inboxItemId: 1783065241912-neeflwd`

### 4. ARGUS Inbox UI

Open: `http://localhost:3002/argus/inbox`  
Expect pending items from tests above with attachment count in preview.

---

## Real inbound email (pending)

**Not yet verified.** Blockers:

1. Cloudflare zone for `argometal.dev` not created (OAuth token permission error: `com.cloudflare.api.account.zone.create`)
2. Registrar NS still Porkbun

**After zone is active and routing rule exists:**

1. Send test email to **`argus@argometal.dev`** (include one attachment)
2. Tail Worker: `cd argus-email-bridge && npx wrangler tail argus-email-intake`
3. Confirm API `201` in Worker logs / intake response
4. Confirm item in `/argus/inbox` with correct attachment count

---

## API zone-create error (for reference)

```
POST /zones failed: Requires permission "com.cloudflare.api.account.zone.create"
```

Wrangler OAuth scopes include `email_routing:write` and `zone:read` but **not** zone create. Zone must be added in Dashboard (or via API token with Zone:Create).

---

## Redeploy Worker (after tunnel URL changes)

```powershell
cd c:\Tools\MatrixTrade
npx tsx tools/deploy-argus-email-worker.ts https://YOUR-NEW-TUNNEL.trycloudflare.com/api/argus/email-inbox
```

---

## Next step after real email works

1. Create **named Cloudflare Tunnel** bound to a stable hostname
2. Update Worker `ARGUS_INTAKE_URL` to the named tunnel URL
3. Re-run real email test

---

## Related

- [`argus-email-intake-p1.md`](argus-email-intake-p1.md) — architecture plan
- [`argus-email-inbox.md`](argus-email-inbox.md) — JSON contract
- [`argus-email-bridge/README.md`](../../argus-email-bridge/README.md) — Worker source
