# Current deploy

Production: https://matrix-trade-theta.vercel.app

Pinned revision: `main0815a` (auth ship) — see latest `main` for terminology correction after #312 revert

Ship commits:
- `21cb4a7` — PR #309 Forge → Argus login / guest-lock
- `0ea237a` — PR #312 trading `?` help (**reverted** — wrong “MTA” meaning for Forge workstream)

Includes (still live from prior pins + #309):
- PR #309: `/forge` uses Argus login + guest-lock path (`argus-auth`)
- Topics list ↔ full detail (no side preview overlap)
- Neighborhood +/− zoom, turn, 3D tilt, drag-to-pin / Relax / Reset
- Depth 2 / 3 / 5 with structural bridge trim fix; Universe button removed
- A mark systems menu (replaces ··· + duplicate A)

**Terminology:** In ArgusForge docs, **MTA** = matrix/time engine (`argusforge-contract.md` §10). Trading product = **MatrixTrade**. See [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md).

IA handoffs: [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md) · [`../argus/consolidated-product-direction.md`](../argus/consolidated-product-direction.md)

Sync:
```bash
git fetch origin --tags
git checkout main
git reset --hard origin/main
```
