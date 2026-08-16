# Current deploy

Production: https://matrix-trade-theta.vercel.app

Pinned revision: `main0815k`

Ship commit: `a2ec8c1`

Includes:
- PR #351 — Neighborhood graph size stable on scroll (no wheel zoom; fixed 480px canvas)
- Prior `main0815j` / #348–#349: 16-0E Scout Case multi-plan selector
- Prior `main0815i` / #347: 16-08 Scout trim & convergence + 16-07 audit
- Prior `main0815h` / #341–#342: A06 Topics scroll / no pinned detail chrome
- Prior `main0815g` / #339–#340: War Universe 16-04 + 16-01 + 16-03 Dashboard consolidation
- Prior `main0815f` / #334: 15-0C Needs review human-only (#333)

**Terminology:** In ArgusForge docs, **MTA** = matrix/time engine (`argusforge-contract.md` §10). Trading product = **MatrixTrade**. See [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md).

IA handoffs: [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md) · [`../argus/consolidated-product-direction.md`](../argus/consolidated-product-direction.md)

Sync:
```bash
git fetch origin --tags
git checkout main
git reset --hard origin/main
```
