# Current deploy

Production: https://matrix-trade-theta.vercel.app

Pinned revision: `main0815d`

Ship commit: `3cea926`

Includes:
- PR #325 — `missed_opportunity` Scout outcome (entry never reached; distinct from UPL)
- PR #326 — build fix (exclude miss test from Next typecheck)
- PR #324 — PLAN-ID architecture (min pad 3; sequence; insert-only create)
- Prior `main0815c` / #317: Hot Treemap-only + Tags rename/plot

**Terminology:** In ArgusForge docs, **MTA** = matrix/time engine (`argusforge-contract.md` §10). Trading product = **MatrixTrade**. See [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md).

IA handoffs: [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md) · [`../argus/consolidated-product-direction.md`](../argus/consolidated-product-direction.md)

Sync:
```bash
git fetch origin --tags
git checkout main
git reset --hard origin/main
```

