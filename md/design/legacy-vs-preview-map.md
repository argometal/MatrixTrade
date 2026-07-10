# MatrixTrade — Legacy vs Preview Mode Map

**Last updated:** 2026-07-10  
**Purpose:** Route map for preview shell (active) vs legacy components (preserved).

---

## Mode definitions

| Mode | Shell | Status |
|------|-------|--------|
| **Preview (active)** | Dark `PreviewShell`, full viewport | All trading routes |
| **Legacy (preserved)** | Light card layout | `app/components/legacy/*` — not mounted |

Parent layout: `PreviewRouteLayout` wraps all `(nav)` and `(preview)` route groups.

---

## Route table

| Route | Preview | Classic UI preserved | Notes |
|-------|:-------:|:--------------------:|-------|
| `/home-preview` | ✓ | — | **Dashboard** — primary home |
| `/trades-preview` | ✓ | — | **New Trade** workspace |
| `/trades` | ✓ | — | Trades list (`PreviewTradesList`) |
| `/journal` | ✓ | — | Closed trades log |
| `/mistakes` | ✓ | — | Mistake cost breakdown |
| `/playbook` | ✓ | — | Playbook Lab |
| `/planning` | ✓ | — | **Planning** — pre-trade plans |
| `/system` | ✓ | — | Bridge sync, vault, connect |
| `/inbox`, `/inbox/[id]` | ✓ | — | Pipeline inbox |
| `/stats` | ✓ | `LegacyStatsPage` | `PreviewStats` |
| `/review` | ✓ | `LegacyReviewPage` | `PreviewReview` |
| `/exchange` | ✓ | `LegacyExchangePage` | `PreviewExchange` + dark `HomeDashboard*` |
| `/trades/new` | ✓ | `LegacyTradeNewPage` | `PreviewTradeNew` |
| `/trades/[id]` | ✓ | `LegacyTradeDetailPage` | `PreviewTradeDetail` |
| `/trades/[id]/review` | ✓ | `LegacyTradeReviewPage` | `PreviewTradeReview` |
| `/` | redirect | — | → `/home-preview` |
| `/connect` | redirect | — | → `/system#connect` |
| `/ai-workspace` | redirect | — | → `/exchange` |

---

## Legacy component locations

| Legacy component | Path |
|------------------|------|
| Stats | `app/components/legacy/LegacyStatsPage.tsx` |
| Review | `app/components/legacy/LegacyReviewPage.tsx` |
| Exchange | `app/components/legacy/LegacyExchangePage.tsx` |
| Trade detail | `app/components/legacy/LegacyTradeDetailPage.tsx` |
| Trade review | `app/components/legacy/LegacyTradeReviewPage.tsx` |
| New trade | `app/components/legacy/LegacyTradeNewPage.tsx` |
| Nav layout | `app/(trading)/(nav)/layout.legacy.tsx` |

---

## Related docs

- [features-used-vs-unused-checklist.md](features-used-vs-unused-checklist.md) — what is wired vs orphaned
- [new-mode-parity-checklist.md](new-mode-parity-checklist.md) — parity before retiring classic links
- [home-preview-checklist.md](home-preview-checklist.md) · [trades-preview-checklist.md](trades-preview-checklist.md)
