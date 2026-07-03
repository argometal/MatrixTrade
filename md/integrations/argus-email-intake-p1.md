# ARGUS Email Intake — P1 Implementation Plan

**Status:** P1 — one supported intake method  
**UI:** Frozen — no ARGUS UI changes  
**Goal:** Real email → InboxItem via existing `POST /api/argus/email-inbox`

---

## Method chosen (P1)

### **Cloudflare Email Routing + Email Worker**

| Why this one | |
|--------------|---|
| You already use Cloudflare | `argometal.workers.dev`, MatrixTrade bridge deployed |
| No OAuth / IMAP | No Gmail API, no polling, no Supabase |
| Provider-agnostic at ARGUS | Worker outputs the JSON contract; ARGUS unchanged |
| Email never in GitHub | MIME parsed in Worker → POST to your MatrixTrade host → local `ARGUS_DATA_DIR` |

**Not P1:** Gmail OAuth, Outlook, IMAP cron, SendGrid/Mailgun (valid later — same JSON endpoint).

---

## Architecture

```text
sender@gmail.com
    ↓ forward (optional)
argus@yourdomain.com          ← Cloudflare Email Routing (MX)
    ↓
argus-email-intake Worker     ← parse MIME (postal-mime)
    ↓ POST JSON + Bearer
https://<tunnel>/api/argus/email-inbox
    ↓
MatrixTrade (local)           ← ARGUS_DATA_DIR on disk
    ↓
/argus/inbox (pending item)
```

**Critical:** MatrixTrade with ARGUS must be **reachable from the Worker**. Local dev uses **Cloudflare Tunnel** (or a stable public URL). Vercel alone is ephemeral for `ARGUS_DATA_DIR` — not recommended for evidence retention.

---

## Components (repo)

| Path | Role |
|------|------|
| `argus-email-bridge/` | Email Worker — MIME → JSON → POST |
| `argus-email-bridge/sample-email-payload.json` | Manual curl test body |
| `POST /api/argus/email-inbox` | Existing — **no changes** |
| `lib/argus/email-inbox.ts` | Existing parser — **no changes** |

---

## Setup checklist

### 1. MatrixTrade local

`.env.local`:

```env
ARGUS_INBOX_TOKEN=your-secret-token
ARGUS_DATA_DIR=C:\Users\you\ArgusData
ARGUS_PASSWORD=...
```

Start: `npm run dev` → `http://localhost:3000`

### 2. Expose local API (Tunnel)

Example (one-time):

```bash
cloudflared tunnel --url http://localhost:3000
```

Note the HTTPS URL (e.g. `https://random.trycloudflare.com`).  
**Intake URL:** `https://random.trycloudflare.com/api/argus/email-inbox`

For production-like stability, use a named Cloudflare Tunnel route.

### 3. Deploy Email Worker

```bash
cd argus-email-bridge
npm install
npx wrangler secret put ARGUS_INBOX_TOKEN      # same as .env.local
npx wrangler secret put ARGUS_INTAKE_URL      # full URL from step 2
deploy.bat
```

### 4. Cloudflare Email Routing

1. Cloudflare Dashboard → your domain → **Email** → **Email Routing**
2. Enable routing; add MX records if prompted
3. Create address: `argus@yourdomain.com` (or subdomain)
4. **Action:** Send to Worker → `argus-email-intake`
5. (Optional) Gmail: Settings → Forwarding → `argus@yourdomain.com`

### 5. Verify

1. Manual curl (below) → item in `/argus/inbox`
2. Send real email to `argus@yourdomain.com` → same

---

## Manual curl test (no email)

From repo root:

```bash
curl -X POST http://localhost:3000/api/argus/email-inbox \
  -H "Authorization: Bearer YOUR_ARGUS_INBOX_TOKEN" \
  -H "Content-Type: application/json" \
  -d @argus-email-bridge/sample-email-payload.json
```

**PowerShell:**

```powershell
$token = "YOUR_ARGUS_INBOX_TOKEN"
$body = Get-Content -Raw argus-email-bridge\sample-email-payload.json
Invoke-RestMethod -Uri "http://localhost:3000/api/argus/email-inbox" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
  -Body $body
```

Expected: `201` with `{ "ok": true, "inboxItemId": "...", "attachmentCount": 1 }`

---

## Secrets (Worker)

| Secret | Example |
|--------|---------|
| `ARGUS_INBOX_TOKEN` | Same as MatrixTrade `.env.local` |
| `ARGUS_INTAKE_URL` | `https://your-tunnel.example.com/api/argus/email-inbox` |

Never commit tokens. Never store email bodies in git.

---

## Alternatives (documented, not P1)

| Method | Pros | Cons |
|--------|------|------|
| **Gmail forwarding → CF Email Routing** | Uses P1 worker; user forwards Gmail | Still needs domain + CF |
| **SendGrid Inbound Parse** | Mature webhook | Extra vendor, transform webhook → JSON |
| **Mailgun Routes** | Same | Extra vendor |
| **Gmail API + cron on VPS** | Full control | OAuth, ops burden, not minimal |

---

## Future (not P1)

- Stable named tunnel in repo docs
- Retry / dead-letter if ARGUS down
- `?q=` / assistant prefill (separate track)
- Supabase blob storage for attachments

---

## Related

- [`argus-email-inbox.md`](argus-email-inbox.md) — JSON contract + storage rules
- [`argus-email-bridge/README.md`](../../argus-email-bridge/README.md) — deploy commands
