# ARGUS Export / Delivery Layer

**Repository:** [MatrixTrade](https://github.com/argometal/MatrixTrade)  
**Module:** ARGUS at `/argus/*`  
**Production:** https://matrix-trade-theta.vercel.app  
**Date:** 2026-08-06  
**Status:** Deliver **v1 shipped** — Quick Package (HTML + Markdown) + Evidence Vault (ZIP). Further package types remain proposed.

Read with [`ai-charter.md`](ai-charter.md), [`correlation-guide.md`](correlation-guide.md), [`deliver-formats-plan.md`](deliver-formats-plan.md), and [`README.md`](README.md).  
Apps / Forge context: [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md).

---

## Product loop

```text
Receive → Organize → Correlate → Retrieve → Deliver
```

Deliver v1 is live for scoped evidence packages. Do **not** use older analysis files that claimed Deliver was unimplemented (removed).

---

## What ships today

| Package | Format | Notes |
|---------|--------|-------|
| Quick Package | HTML + Markdown | Human-readable evidence slice |
| Evidence Vault | ZIP | Manifest + evidence + files |

Surfaces: `/argus/v2/deliver`, export APIs under `/api/argus/export` and `/api/argus/deliver/*`, code under `lib/argus/export/`.

JSON = machine truth. ZIP = delivery container. HTML = human view.

---

## Still proposed (not v1)

Relationship Brief and other package types in `deliver-formats-plan.md` — analyze before implementing; do not mark as shipped.

---

## Agent rules

1. Every conclusion in a package must trace to evidence (AI Charter).
2. Prefer reusing existing export helpers over new one-off downloaders.
3. If this doc conflicts with code, **code wins** — update this file.
