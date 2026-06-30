# MatrixTrade Bridge (Cloudflare Worker + KV)

Lives inside the MatrixTrade repo: `bridge/`. Not connected to the Next.js app yet.

Canonical plan: [`md/integrations/cloudflare-worker-bridge.md`](../md/integrations/cloudflare-worker-bridge.md)

## Deploy

One-shot (creates KV, tokens, deploy, curl test):

```bat
cd c:\Tools\MatrixTrade\bridge
deploy.bat
```

First run opens Cloudflare login in browser. Tokens saved to `.dev.vars` (gitignored). Script prints GET URL for ChatGPT.

Manual steps: see [`md/integrations/cloudflare-worker-bridge.md`](../md/integrations/cloudflare-worker-bridge.md)
