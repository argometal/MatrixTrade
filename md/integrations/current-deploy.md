# Current deploy

Production: https://matrix-trade-theta.vercel.app

Pinned revision: `main0815b`

Ship commit: `43e59d2`

Includes:
- PR #313 — Trades UI English + Scout→Trades pipeline proposal (`scout-trades-pipeline-001.md`)
- PR #314 — MTA-SAMPLE-001 Scout corpus probe (`mta-sample-001.md`) — Capture not ready; needs prod export
- Prior `main0815a` / #309: `/forge` Argus login + guest-lock; neighborhood camera/pins; Topics detach

**Terminology:** In ArgusForge docs, **MTA** = matrix/time engine (`argusforge-contract.md` §10). Trading product = **MatrixTrade**. See [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md).

IA handoffs: [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md) · [`../argus/consolidated-product-direction.md`](../argus/consolidated-product-direction.md)

Sync:
```bash
git fetch origin --tags
git checkout main
git reset --hard origin/main
```
