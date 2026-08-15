# Current deploy

Production: https://matrix-trade-theta.vercel.app

Pinned revision: `main0815a`

Ship commit: `0ea237a`

Includes:
- PR #309: `/forge` uses Argus login + guest-lock path (`argus-auth`)
- PR #312: MTA Argus-style `?` help per UI area (Dashboard · Scout · Trades · Capital)
- Topics list ↔ full detail (no side preview overlap)
- Neighborhood +/− zoom, turn, 3D tilt, drag-to-pin / Relax / Reset
- Depth 2 / 3 / 5 with structural bridge trim fix; Universe button removed
- A mark systems menu (replaces ··· + duplicate A)

IA handoffs: [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md) · [`../argus/consolidated-product-direction.md`](../argus/consolidated-product-direction.md)

Sync:
```bash
git fetch origin --tags
git checkout main
git reset --hard origin/main
# optional: git checkout main0815a
```
