# Current deploy

Production: https://matrix-trade-theta.vercel.app

Pinned revision: `main0815e`

Ship commit: `1c36e91`

Includes:
- PR #329 — 15-12 MTA Control language / SNAPSHOT MENU ontology (visible labels 1:1; Learning→MAF)
- Prior `main0815d` / #327: missed_opportunity + PLAN-ID (#324–#326)

**Terminology:** In ArgusForge docs, **MTA** = matrix/time engine (`argusforge-contract.md` §10). Trading product = **MatrixTrade**. See [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md).

IA handoffs: [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md) · [`../argus/consolidated-product-direction.md`](../argus/consolidated-product-direction.md)

Sync:
```bash
git fetch origin --tags
git checkout main
git reset --hard origin/main
```
