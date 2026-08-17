# Current deploy

Production: https://matrix-trade-theta.vercel.app

Pinned revision: `main0815o`

Ship commit: `b45f229`

Includes:
- PR #359 — Event Note Add ↔ Tags tab dual-write (save tag without note body)
- Prior `main0815n` / #356–#358: Home Tags manager + Pattern counts
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
