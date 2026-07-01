# MatrixTrade Bridge (Cloudflare Worker + KV)

Lives inside the MatrixTrade repo: `bridge/`. Not connected to the Next.js app yet.

Canonical plan: [`md/integrations/cloudflare-worker-bridge.md`](../md/integrations/cloudflare-worker-bridge.md)

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/snapshot` | Bearer WRITE_TOKEN |
| GET | `/snapshot?token=READ_TOKEN` | |
| POST | `/inbox` | Bearer WRITE_TOKEN — queues JSON, does **not** write trades |
| GET | `/inbox?token=READ_TOKEN` | pending items only |

## Deploy

```bat
cd c:\Tools\MatrixTrade\bridge
deploy.bat
```

First-time subdomain: `register-subdomain.bat`

## Test inbox

```powershell
curl.exe -X POST "https://matrixtrade-bridge.argometal.workers.dev/inbox" `
  -H "Authorization: Bearer WRITE_TOKEN" `
  -H "Content-Type: application/json" `
  --data-binary "@sample-inbox.json"

curl.exe "https://matrixtrade-bridge.argometal.workers.dev/inbox?token=READ_TOKEN"
```

Replace tokens from `.dev.vars` (gitignored).
