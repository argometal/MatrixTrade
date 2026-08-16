# Current deploy

Production: https://matrix-trade-theta.vercel.app

Pinned revision: `main0815g`

Ship commit: `fc02da0`

Includes:
- PR #339 — 16-04 Operational War Universe + 16-01 Needs Attention cleanup + 16-03 Scout Monitoring Action now / Waiting
- Prior `main0815f` / #334: 15-0C Needs review human-only (#333)
- Prior `main0815e` / #330: 15-12 Control language / SNAPSHOT MENU ontology (#329)

**Terminology:** In ArgusForge docs, **MTA** = matrix/time engine (`argusforge-contract.md` §10). Trading product = **MatrixTrade**. See [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md).

IA handoffs: [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md) · [`../argus/consolidated-product-direction.md`](../argus/consolidated-product-direction.md)

Sync:
```bash
git fetch origin --tags
git checkout main
git reset --hard origin/main
```
