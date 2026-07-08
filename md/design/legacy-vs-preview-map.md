# MatrixTrade — Legacy vs Preview Mode Map

**Last updated:** 2026-07-07  
**Purpose:** Single source for which routes belong to legacy (classic), preview (new visual), or shared. Use before disabling legacy links or retiring classic pages.

---

## Mode definitions

| Mode | Shell | Desktop nav | Mobile entry |
|------|-------|-------------|--------------|
| **Preview (new)** | Dark `PreviewShell`, full viewport | `PreviewSidebar` | Default: `/` → `/home-preview` |
| **Legacy (classic)** | Light card layout | `TradingNav` (`lg+` only) | Via hamburger / classic toggle |
| **Shared** | Classic shell today; linked from preview nav | Both navs | Same mobile chrome on all trading routes |

Parent layout `app/(trading)/layout.tsx` wraps **all** trading routes (mobile header, bottom tabs, hamburger).

---

## Route table

| Route | Legacy | Preview | Status | Notes |
|-------|:------:|:-------:|--------|-------|
| `/home-preview` | — | ✓ | **Preview home** | Situation Room — replaces classic dashboard UX |
| `/trades-preview` | — | ✓ | **Preview trades** | Trades workspace — replaces classic `/trades` list UX |
| `/` | ✓ | — | **Legacy dashboard** | `ClassicDashboard` — duplicate of home-preview purpose |
| `/trades` | ✓ | — | **Legacy trades list** | Table only — duplicate of trades-preview list |
| `/trades/new` | ✓ | partial | **Shared action** | Full form in classic; traditional entry panel in trades-preview |
| `/trades/[id]` | ✓ | — | **Legacy only** | Open/close, meta, Obsidian link — no preview equivalent |
| `/trades/[id]/review` | ✓ | — | **Legacy only** | Review wizard — no preview equivalent |
| `/exchange` | ✓ | partial | **Shared / overlap** | Full assistant + snapshot; trades-preview has subset (AI block import) |
| `/playbook` | ✓ | — | **Legacy only** | Playbook Lab — linked from preview, no dark UI |
| `/review` | ✓ | — | **Legacy only** | Review hub / attention queue |
| `/stats` | ✓ | — | **Legacy only** | Cycle statistics + equity |
| `/journal` | ✓ | — | **Legacy only** | Closed trades log |
| `/mistakes` | ✓ | — | **Legacy only** | Mistake cost analysis |
| `/inbox` | ✓ | — | **Shared pipeline** | Mobile tab; no preview-specific UI |
| `/inbox/[id]` | ✓ | — | **Shared pipeline** | Apply/reject proposals |
| `/system` | ✓ | — | **Legacy only** | Bridge sync, vault, tokens |
| `/connect` | ✓ | — | **Redirect** | → `/system#connect` |
| `/ai-workspace` | ✓ | — | **Redirect** | → `/exchange` |
| `/login` | ✓ | ✓ | **Auth** | Same gate for both modes |

---

## Candidates to disable in legacy nav (not delete routes yet)

These classic **entry points** duplicate preview screens. Disable links first; keep routes for deep links and rollback.

| Legacy link | Preview replacement | Disable in |
|-------------|---------------------|------------|
| Dashboard `/` | `/home-preview` | `TradingNav`, mobile default (already redirects) |
| Classic trades `/trades` | `/trades-preview` | `TradingNav`, `TradesViewSwitch` classic side |
| Home preview link (redundant on classic) | — | Optional: hide from classic nav once preview is default everywhere |

**Do not disable yet (no preview UI):**

- `/trades/new`, `/trades/[id]`, `/trades/[id]/review`
- `/playbook`, `/review`, `/stats`, `/journal`, `/mistakes`
- `/inbox`, `/inbox/[id]`
- `/system`, `/connect`
- `/exchange` (until assistant is fully in preview shell)

---

## View switches (classic ↔ preview)

| Component | Classic route | Preview route |
|-----------|---------------|---------------|
| `DashboardViewSwitch` | `/` | `/home-preview` |
| `TradesViewSwitch` | `/trades` | `/trades-preview` |

---

## Server actions by mode

| Action | Legacy pages | Preview pages |
|--------|--------------|---------------|
| `importAiBlockAction` | `/exchange` | `/trades-preview` |
| `createTradeAction` | `/trades/new` | — (proposal → inbox only in preview) |
| `openTradeAction`, `closeTradeAction`, `updateTradeMetaAction` | `/trades/[id]` | — |
| `saveReviewAction` | `/trades/[id]/review` | — |
| `applyInboxItemAction`, `rejectInboxItemAction` | `/inbox/[id]` | — |
| `syncBridgeFormAction` | `/system` | — |

---

## Related docs

- [new-mode-parity-checklist.md](new-mode-parity-checklist.md) — features to port into preview
- [home-preview-checklist.md](home-preview-checklist.md) — Situation Room QA
- [trades-preview-checklist.md](trades-preview-checklist.md) — Trades workspace QA
- [../architecture/matrixtrade-app.md](../architecture/matrixtrade-app.md) — app architecture (needs refresh)
