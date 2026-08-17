# Current deploy

Production: https://matrix-trade-theta.vercel.app

Pinned revision: `main0815n`

Ship commit: `a2b992a`

Includes:
- PR #357 — Patterns + Home Tags counts roll Event evidence up
- PR #356 — Home Tags manager: rename, create, delete
- Prior `main0815m` / #354–#355: Runbook check → Use as tag…
- Prior `main0815l` / #350–#353: Events → Tags branch drag onto Linked
- Prior `main0815k` / #351–#352: Neighborhood graph size stable on scroll
- Prior `main0815j` / #348–#349: 16-0E Scout Case multi-plan selector
- Prior `main0815i` / #347: 16-08 Scout trim & convergence + 16-07 audit
- Prior `main0815h` / #341–#342: A06 Topics scroll / no pinned detail chrome

**Terminology:** In ArgusForge docs, **MTA** = matrix/time engine (`argusforge-contract.md` §10). Trading product = **MatrixTrade**. See [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md).

IA handoffs: [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md) · [`../argus/consolidated-product-direction.md`](../argus/consolidated-product-direction.md)

Sync:
```bash
git fetch origin --tags
git checkout main
git reset --hard origin/main
```
