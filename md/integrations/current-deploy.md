# Current deploy

Production: https://matrix-trade-theta.vercel.app

Pinned revision: `main0815g` (promote after consolidated Dashboard merges to `main`)

Ship candidate: `bcde18b` (`cursor/war-universe-16-04-b0a5` tip — **16-01 + 16-03 + 16-04**)

Includes (Dashboard consolidation for human eval):
- PR #339 — 16-04 Operational War Universe + stacked 16-01 Needs Attention + 16-03 Scout Monitoring Action now / Waiting
- Prior PR #337 / #336 drafts superseded by #339 tip for eval
- Prior `main0815f` / #334: 15-0C Needs review human-only (#333)
- Prior `main0815e` / #330: 15-12 Control language / SNAPSHOT MENU ontology (#329)

**Promote steps (no architecture changes during deploy):**
1. Merge #339 (or equivalent consolidated PR) to `main`.
2. Set Ship commit below to the resulting `main` merge SHA.
3. Deploy / verify Vercel Production green.
4. Replace “Ship candidate” with the final Ship commit.

**Do not promote until human review of War Universe Case/Compare/Allocation.**

**Terminology:** In ArgusForge docs, **MTA** = matrix/time engine (`argusforge-contract.md` §10). Trading product = **MatrixTrade**. See [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md).

IA handoffs: [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md) · [`../argus/consolidated-product-direction.md`](../argus/consolidated-product-direction.md)

Sync:
```bash
git fetch origin --tags
git checkout main
git reset --hard origin/main
```
