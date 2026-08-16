# Current deploy

Production: https://matrix-trade-theta.vercel.app

Pinned revision: `main0815f`

Ship commit: `02db2c1`

Includes:
- PR #333 — 15-0C Scout monitoring Needs review = human decisions only (no market-data noise)
- Prior `main0815e` / #330: 15-12 Control language / SNAPSHOT MENU ontology (#329)

**Terminology:** In ArgusForge docs, **MTA** = matrix/time engine (`argusforge-contract.md` §10). Trading product = **MatrixTrade**. See [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md).

IA handoffs: [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md) · [`../argus/consolidated-product-direction.md`](../argus/consolidated-product-direction.md)

Sync:
```bash
git fetch origin --tags
git checkout main
git reset --hard origin/main
```
