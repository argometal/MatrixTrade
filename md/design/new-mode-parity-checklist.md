# MatrixTrade — New Mode Parity Checklist

**Purpose:** Track legacy functionality that must exist (or be linked) in preview mode before classic pages can be retired from nav.  
**Audience:** Product + dev — user checks boxes after verifying in browser.  
**Companion:** [legacy-vs-preview-map.md](legacy-vs-preview-map.md)

**Process:** Same as [README.md](README.md) — update this file when preview scope changes.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-07 | Initial parity audit — legacy vs preview gap analysis |

---

## 1. Home preview (`/home-preview`) vs classic dashboard (`/`)

| # | Legacy feature (`ClassicDashboard`) | Preview status | Box |
|---|-------------------------------------|----------------|-----|
| 1.1 | Today's Status tiles (cycle, P/L, budget, open, pending reviews, playbooks) | KPI cards + trade status donut | - [ ] |
| 1.2 | Needs Attention queue (`buildAttentionItems`) | Alerts panel with links | - [ ] |
| 1.3 | Best / worst playbook insight cards | Top playbooks panel | - [ ] |
| 1.4 | Mistake cost highlight | Not in preview — links to `/mistakes` only | - [ ] |
| 1.5 | Equity curve (`EquityCurve`) | Dark mini chart in preview | - [ ] |
| 1.6 | Performance summary (PF, expectancy, drawdown) | Partial in KPI row | - [ ] |
| 1.7 | Infra hidden from main view | ✓ preview is product-first | - [ ] |
| 1.8 | Link to classic dashboard | Classic toggle present | - [ ] |
| 1.9 | Data parity with `/` for same cycle | Numbers match | - [ ] |

---

## 2. Trades preview (`/trades-preview`) vs classic trades (`/trades`, `/trades/new`, `/exchange`)

| # | Legacy feature | Preview status | Box |
|---|----------------|----------------|-----|
| 2.1 | Trades table with status filters | Tabs: New, Open, Pending, Closed, All | - [ ] |
| 2.2 | Search / filter rows | Search box in workspace | - [ ] |
| 2.3 | Open positions + total risk | Positions panel | - [ ] |
| 2.4 | Create trade form (`/trades/new`) | Traditional entry → proposal only | - [ ] |
| 2.5 | Direct create (`createTradeAction`) | **Not in preview** — by design → inbox | - [ ] |
| 2.6 | Trade detail `/trades/[id]` | Links out to classic detail | - [ ] |
| 2.7 | Open / close trade | Classic detail only | - [ ] |
| 2.8 | Assign playbook on trade | Classic detail only | - [ ] |
| 2.9 | Review wizard `/trades/[id]/review` | Classic only | - [ ] |
| 2.10 | AI Block import (`importAiBlockAction`) | ✓ Accept → Inbox | - [ ] |
| 2.11 | Copy snapshot for ChatGPT (`/exchange`) | **Not in trades-preview** | - [ ] |
| 2.12 | AI notes panel (`/exchange`) | **Not in preview** | - [ ] |
| 2.13 | Worker reachability / sync status | `/system` only | - [ ] |
| 2.14 | Quick stats (best/worst trade, best playbook) | Highlights row in workspace | - [ ] |

---

## 3. Analytics & lab pages (classic only — need preview shell or dark variants)

| # | Legacy route | Core functionality | Preview plan | Box |
|---|--------------|-------------------|--------------|-----|
| 3.1 | `/playbook` | Per-strategy stats, status, checklist | Link only — build `/playbook-preview` or embed in Situation Room | - [ ] |
| 3.2 | `/review` | Attention queue + unreviewed trades | Overlap with home alerts — dedicated preview TBD | - [ ] |
| 3.3 | `/stats` | Full cycle analytics, equity, playbook table | Partial on home — full stats preview TBD | - [ ] |
| 3.4 | `/journal` | Closed trades + lessons | No preview | - [ ] |
| 3.5 | `/mistakes` | Mistake P/L impact | No preview | - [ ] |

---

## 4. Pipeline & system (must stay reachable from preview nav)

| # | Legacy route | Core functionality | Reachable from preview nav? | Box |
|---|--------------|-------------------|----------------------------|-----|
| 4.1 | `/inbox` | Pending proposals list | ✓ mobile tab + sidebar | - [ ] |
| 4.2 | `/inbox/[id]` | Apply / reject | ✓ from alerts + inbox | - [ ] |
| 4.3 | `/system` | Sync to Worker, vault paths, tokens | ✓ sidebar | - [ ] |
| 4.4 | `/connect` | QR / mobile LAN | ✓ via `/system#connect` | - [ ] |
| 4.5 | `/exchange` | Assistant workspace | ✓ sidebar — not in preview shell | - [ ] |

---

## 5. Navigation & mobile (preview mode infrastructure)

| # | Feature | Box |
|---|---------|-----|
| 5.1 | Desktop `PreviewSidebar` — all sections (Workspace, Trading, System) | - [ ] |
| 5.2 | Mobile bottom tabs — Home, Trades, Inbox | - [ ] |
| 5.3 | Hamburger — full route audit | - [ ] |
| 5.4 | Inbox badge on nav | - [ ] |
| 5.5 | Cycle progress in sidebar / drawer | - [ ] |
| 5.6 | ARGUS corner on preview routes | - [ ] |
| 5.7 | Classic routes open in light shell (expected until ported) | - [ ] |

---

## 6. Safe legacy disable gates (before removing classic links)

Complete **all** before hiding `/` and `/trades` from `TradingNav`:

| Gate | Box |
|------|-----|
| G.1 | Home preview data parity verified (section 1) | - [ ] |
| G.2 | Trades preview covers daily trade workflow (section 2) | - [ ] |
| G.3 | User can reach inbox, system, exchange from preview without classic nav | - [ ] |
| G.4 | Trade detail/review reachable from preview tables (links work) | - [ ] |
| G.5 | Desktop users have preview as opt-in or default (cookie / setting) | - [ ] |
| G.6 | `md/design/*` checklists signed off for home + trades preview | - [ ] |

---

## Priority order for new visual mode work

1. **P0 — Keep pipeline working:** inbox, system, exchange links from preview nav (done — verify).
2. **P1 — Parity:** home KPIs/alerts; trades table + assistant proposal flow.
3. **P2 — Dark variants:** playbook, stats, review (or embed key widgets in Situation Room).
4. **P3 — Retire classic nav links:** `/`, `/trades` hidden from `TradingNav` after G.1–G.6.
