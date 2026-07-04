# ARGUS Email Intake — End-to-End Flow

**Phase 1 checkbox:** Receive email automatically  
**Last verified:** 2026-07-04 (Worker → tunnel → API → `ARGUS_DATA_DIR`)

---

## Complete flow

```mermaid
flowchart LR
  SMTP[Internet SMTP] --> ER[Cloudflare Email Routing<br/>argus@argometal.dev]
  ER --> W[Worker argus-email-intake<br/>postal-mime → JSON]
  W -->|POST Bearer ARGUS_INBOX_TOKEN| T[Tunnel URL]
  T --> DEV[Next.js :3002<br/>POST /api/argus/email-inbox]
  DEV --> FS[ARGUS_DATA_DIR<br/>journal.json + files/]
  FS --> UI[/argus/inbox]
```

| Step | Component | Status |
|------|-----------|--------|
| 1 | MX / Email Routing → `argus@argometal.dev` | ✅ Configured |
| 2 | Worker `argus-email-intake` | ✅ Deployed |
| 3 | Worker `ARGUS_INTAKE_URL` | Must match **live** tunnel |
| 4 | Tunnel → `localhost:3002` | Requires `cloudflared` + `npm run dev` |
| 5 | API auth `ARGUS_INBOX_TOKEN` | Must match Worker secret + `.env.local` |
| 6 | Storage `ARGUS_DATA_DIR` | Local disk (not Vercel) |
| 7 | UI `/argus/inbox` | Reads same storage as API |

---

## Where the chain broke (2026-07-04 audit)

| Failure | Symptom | Cause |
|---------|---------|-------|
| **Primary** | Real email rejected / never in inbox | Worker `ARGUS_INTAKE_URL` pointed to **expired quick tunnel** |
| **Secondary** | `intake.argometal.dev` → HTTP 525 | Named tunnel connector down **or** DNS not CNAME to `{tunnel-id}.cfargotunnel.com` |
| **Tertiary** | Local API 500 | Corrupt `.next` cache — restart dev after `Remove-Item .next` |
| **Not the fix (yet)** | Vercel inbox empty | Vercel has no `ARGUS_INBOX_TOKEN` and no persistent `ARGUS_DATA_DIR` |

---

## Smallest fix applied

1. **Restart** clean dev server on `:3002`
2. **Start** live quick tunnel → `https://….trycloudflare.com`
3. **Redeploy** Worker secrets:

```powershell
cd c:\Tools\MatrixTrade
npx tsx tools/deploy-argus-email-worker.ts https://YOUR-QUICK-TUNNEL.trycloudflare.com/api/argus/email-inbox
```

4. **Verify**:

```powershell
npx tsx tools/verify-argus-email-intake.ts https://YOUR-QUICK-TUNNEL.trycloudflare.com
$env:NODE_PATH = "argus-email-bridge\node_modules"
npx tsx tools/simulate-email-worker-intake.ts https://YOUR-QUICK-TUNNEL.trycloudflare.com/api/argus/email-inbox
```

5. **Real email:** send to `argus@argometal.dev` → open `http://localhost:3002/argus/inbox`

---

## Permanent tunnel (intake.argometal.dev)

Named tunnel ID: `c55d060c-a0c6-4b86-ab9f-1cdc87e7323e`

**Manual DNS** (required when Zone API auth fails):

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `intake` | `c55d060c-a0c6-4b86-ab9f-1cdc87e7323e.cfargotunnel.com` | Proxied |

Then:

```powershell
.\tools\run-argus-intake-stack.ps1
npx tsx tools/deploy-argus-email-worker.ts https://intake.argometal.dev/api/argus/email-inbox
```

---

## Operational requirement

Email intake is **automatic only while the stack runs**:

- `npm run dev` (port 3002)
- `cloudflared` (quick or named tunnel)
- Worker secret matches current tunnel URL

Quick tunnel URLs **change on restart** — redeploy Worker after each restart until permanent DNS works.

---

## Verification template

```
[ ] npm run dev listening on :3002
[ ] POST /api/argus/email-inbox → 201 (tools/test-email-inbox.ts)
[ ] Tunnel POST → 201 (tools/verify-argus-email-intake.ts)
[ ] Worker simulate → 201 (tools/simulate-email-worker-intake.ts)
[ ] Real email to argus@argometal.dev → item in /argus/inbox
```
