# ARGUS Email Intake — Production (cloud-first)

**Phase 1 checkbox:** Receive email automatically  
**Architecture:** No tunnel. No local PC required for production email.

---

## Production flow

```mermaid
flowchart LR
  SMTP[Real email] --> ER[argus@argometal.dev]
  ER --> W[Worker argus-email-intake]
  W -->|POST Bearer| V[Vercel /api/argus/email-inbox]
  V --> SB[(Supabase argus_inbox_items)]
  V --> ST[(Supabase Storage argus-files)]
  SB --> UI[/argus/inbox on Vercel]
```

| Step | Component |
|------|-----------|
| 1 | Cloudflare Email Routing → Worker |
| 2 | Worker POST → `https://matrix-trade-theta.vercel.app/api/argus/email-inbox` |
| 3 | `ARGUS_INBOX_STORE=supabase` persists inbox + attachments |
| 4 | UI reads same Supabase tables |

**Tunnel approach: deprecated.** Do not use `cloudflared` for production.

---

## One-time setup

### 1. Supabase schema

Run [`supabase/argus-inbox.sql`](../../supabase/argus-inbox.sql) in Supabase SQL editor.

Creates:
- `argus_inbox_items`
- `argus_attachments`
- Storage bucket `argus-files`

### 2. Vercel + Worker

```powershell
cd c:\Tools\MatrixTrade
npx tsx tools/setup-argus-production-inbox.ts
```

This sets Vercel env (`ARGUS_INBOX_STORE=supabase`, `ARGUS_INBOX_TOKEN`, Supabase keys) and redeploys Worker secrets to Vercel production URL.

Redeploy Vercel after env sync.

### 3. Verify

```powershell
cd c:\Tools\MatrixTrade
.\tools\verify-argus-inbox-schema.cmd
.\tools\test-email-inbox.cmd https://matrix-trade-theta.vercel.app
```

Use the `.cmd` wrappers if PowerShell blocks `npx` (execution policy).

Send real email to `argus@argometal.dev` → open `https://matrix-trade-theta.vercel.app/argus/inbox`.

---

## Local dev

Keep `ARGUS_INBOX_STORE` unset or `json` in `.env.local` — uses filesystem `ARGUS_DATA_DIR` as before.

---

## Env vars (Vercel production)

| Variable | Value |
|----------|--------|
| `ARGUS_INBOX_STORE` | `supabase` |
| `ARGUS_INBOX_TOKEN` | same as Worker secret |
| `SUPABASE_URL` | project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service role |
| `ARGUS_PASSWORD` | optional UI login |

Worker secret `ARGUS_INTAKE_URL` = `https://matrix-trade-theta.vercel.app/api/argus/email-inbox`
