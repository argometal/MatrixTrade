# MatrixTrade Bridge (Cloudflare Worker + KV)

Lives inside the MatrixTrade repo: `bridge/`. Not connected to the Next.js app yet.

Canonical plan: [`md/integrations/cloudflare-worker-bridge.md`](../md/integrations/cloudflare-worker-bridge.md)

## Deploy

```bat
cd c:\Tools\MatrixTrade\bridge
call c:\Tools\runtime\env.bat
npm install
npx wrangler login
npx wrangler kv namespace create SNAPSHOT
```

Paste KV `id` into `wrangler.toml`, then:

```bat
npx wrangler secret put WRITE_TOKEN
npx wrangler secret put READ_TOKEN
npx wrangler deploy
```

## Test

```powershell
curl.exe -X POST "https://WORKER_URL/snapshot" `
  -H "Authorization: Bearer WRITE_TOKEN" `
  -H "Content-Type: application/json" `
  --data-binary "@sample-snapshot.json"

curl.exe "https://WORKER_URL/snapshot?token=READ_TOKEN"
```
