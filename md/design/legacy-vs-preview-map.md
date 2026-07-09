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

| Route | Preview | Classic | Notes |
|-------|:-------:|:-------:|-------|
| `/home-preview` | ✓ | — | **Dashboard** — primary home |
| `/trades-preview` | ✓ | — | **New Trade** workspace |
| `/trades` | ✓ | — | Trades list (`PreviewTradesList`) |
| `/journal` | ✓ | — | Closed trades log |
| `/playbook` | ✓ | — | Playbook Lab |
| `/planning` | ✓ | — | **Planning** — pre-trade plans |
| `/system` | ✓ | — | Bridge sync, vault, connect |
| `/` | redirect | — | → `/home-preview` |
| `/inbox`, `/inbox/[id]` | — | ✓ | Pipeline; preview conversion pending |
| `/exchange` | — | ✓ | Assistant + snapshot |
| `/stats`, `/review`, `/mistakes` | — | ✓ | Analytics — preview TBD |
| `/trades/new` | — | ✓ | Direct create form |
| `/trades/[id]`, `/trades/[id]/review` | — | ✓ | Detail + review wizard |
| `/connect` | redirect | — | → `/system#connect` |
| `/ai-workspace` | redirect | — | → `/exchange` |

---

## Related docs

- [features-used-vs-unused-checklist.md](features-used-vs-unused-checklist.md) — what is wired vs orphaned
- [new-mode-parity-checklist.md](new-mode-parity-checklist.md) — parity before retiring classic links
- [home-preview-checklist.md](home-preview-checklist.md) · [trades-preview-checklist.md](trades-preview-checklist.md)
