# MatrixTrade Bridge (Cloudflare Worker + KV)

Lives inside the MatrixTrade repo: `bridge/`. Not connected to the Next.js app yet.

Canonical plan: [`md/integrations/cloudflare-worker-bridge.md`](../md/integrations/cloudflare-worker-bridge.md)

## Deploy

One-shot (creates KV, tokens, deploy, curl test):

```bat
cd c:\Tools\MatrixTrade\bridge
deploy.bat
```

Uses portable Node from `c:\Tools\runtime\node` — no global npm/npx required.

**First-time Cloudflare account:** if deploy stops with *register a workers.dev subdomain*, run once:

```bat
register-subdomain.bat
```

Then run `deploy.bat` again.

Manual login only:

```bat
call c:\Tools\runtime\env.bat
cd c:\Tools\MatrixTrade\bridge
"%NPX%" wrangler login
```

Manual steps: see [`md/integrations/cloudflare-worker-bridge.md`](../md/integrations/cloudflare-worker-bridge.md)
