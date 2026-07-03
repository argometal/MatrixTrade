# ARGUS Email Intake Worker

Cloudflare **Email Worker** — receives email via Email Routing, parses MIME, POSTs JSON to MatrixTrade `POST /api/argus/email-inbox`.

**No ARGUS UI changes.** No data in GitHub.

## Prerequisites

- MatrixTrade running with `ARGUS_INBOX_TOKEN` and `ARGUS_DATA_DIR` in `.env.local`
- Public URL to MatrixTrade (Cloudflare Tunnel recommended for local)
- Cloudflare account with Email Routing on your domain

## Secrets

```bash
cd argus-email-bridge
npm install
npx wrangler secret put ARGUS_INBOX_TOKEN
npx wrangler secret put ARGUS_INTAKE_URL
```

| Secret | Value |
|--------|-------|
| `ARGUS_INBOX_TOKEN` | Same as MatrixTrade `.env.local` |
| `ARGUS_INTAKE_URL` | Full URL, e.g. `https://your-tunnel.trycloudflare.com/api/argus/email-inbox` |

## Deploy

```bash
deploy.bat
```

Worker name: `argus-email-intake`

## Email Routing (Dashboard)

1. Email → Email Routing → enable
2. Create `argus@yourdomain.com`
3. Action: **Send to Worker** → `argus-email-intake`
4. Optional: forward Gmail to that address

## Test without email

```bash
curl -X POST http://localhost:3000/api/argus/email-inbox \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @sample-email-payload.json
```

Then open `/argus/inbox`.

## Full plan

See [`md/integrations/argus-email-intake-p1.md`](../md/integrations/argus-email-intake-p1.md).
