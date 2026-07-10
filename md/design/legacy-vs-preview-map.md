# MatrixTrade — Legacy vs Preview Mode Map

**Last updated:** 2026-07-09  
**Purpose:** Single source for which routes belong to legacy (classic), preview (new visual), or shared.

---

## Mode definitions

| Mode | Shell | Desktop nav | Mobile entry |
|------|-------|-------------|--------------|
| **Preview (new)** | Dark `PreviewShell`, full viewport | `PreviewSidebar` | Default: `/` → `/home-preview` |
| **Legacy (classic)** | Light card layout | `TradingNav` (`lg+` only) | Via hamburger |
| **Shared** | Classic shell; linked from preview nav | Preview sidebar | Same mobile chrome on all trading routes |

Parent layout `app/(trading)/layout.tsx` wraps **all** trading routes.

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
