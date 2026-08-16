# Current deploy

Production: https://matrix-trade-theta.vercel.app

Pinned revision: `main0815h`

Ship commit: `cbe1f4a`

Includes:
- PR #341 — Disable pinned detail compact chrome (A06 Topics / Events / Inbox scroll with header)
- Prior `main0815g` / #339–#340: War Universe 16-04 + Scout build typecheck
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
