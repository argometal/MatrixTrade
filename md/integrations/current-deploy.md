# Current deploy

Production: https://matrix-trade-theta.vercel.app

Pinned revision: `main0815c`

Ship commit: `e8adae0`

Includes:
- PR #317 — Hot filter Treemap-only; Portfolio/Tags stay Universe; Tags rename + clearer recurrence/recency plot
- Prior `main0815b` / #313–#314: Trades EN + Scout pipeline proposal; MTA-SAMPLE-001 probe
- Prior `main0815a` / #309: `/forge` Argus login + guest-lock; neighborhood camera/pins; Topics detach

**Terminology:** In ArgusForge docs, **MTA** = matrix/time engine (`argusforge-contract.md` §10). Trading product = **MatrixTrade**. See [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md).

IA handoffs: [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md) · [`../argus/consolidated-product-direction.md`](../argus/consolidated-product-direction.md)

Sync:
```bash
git fetch origin --tags
git checkout main
git reset --hard origin/main
```
