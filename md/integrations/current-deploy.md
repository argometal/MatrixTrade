# Current deploy

Production: https://matrix-trade-theta.vercel.app

Pinned revision: `main0815g` (promote after #337 merges to `main`)

Ship candidate: `97d9b61` (`cursor/scout-monitoring-action-waiting-16-03-b0a5` tip)

Includes (Dashboard consolidation for human eval):
- PR #337 — 16-01 Needs Attention cleanup + 16-03 Scout Monitoring Action now / Waiting
- Prior `main0815f` / #334: 15-0C Needs review human-only (#333)
- Prior `main0815e` / #330: 15-12 Control language / SNAPSHOT MENU ontology (#329)

**Promote steps (no architecture changes):**
1. Merge #337 to `main`.
2. Set Ship commit below to the resulting `main` merge SHA.
3. Deploy / verify Vercel Production green.
4. Replace “Ship candidate” with the final Ship commit.

**Terminology:** In ArgusForge docs, **MTA** = matrix/time engine (`argusforge-contract.md` §10). Trading product = **MatrixTrade**. See [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md).

IA handoffs: [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md) · [`../argus/consolidated-product-direction.md`](../argus/consolidated-product-direction.md)

Sync:
```bash
git fetch origin --tags
git checkout main
git reset --hard origin/main
```
