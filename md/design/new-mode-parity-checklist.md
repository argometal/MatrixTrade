# MatrixTrade — New Mode Parity Checklist

**Purpose:** Sign-off checklist after preview migration (2026-07-09).  
**Status:** Migration **complete** — all routes use preview shell. User QA pending.  
**Companion:** [legacy-vs-preview-map.md](legacy-vs-preview-map.md)

**Note:** Items marked *classic* below now have preview components. Legacy code preserved in `app/components/legacy/`.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-10 | Migration complete — stats, review, exchange, trade detail/review/new on preview |
| 2026-07-07 | Initial parity audit |

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
| 2.6 | Trade detail `/trades/[id]` | ✓ `PreviewTradeDetail` — links from tables | - [ ] |
| 2.7 | Open / close trade | ✓ preview detail | - [ ] |
| 2.8 | Assign playbook on trade | ✓ preview detail | - [ ] |
| 2.9 | Review wizard `/trades/[id]/review` | ✓ `PreviewTradeReview` | - [ ] |
| 2.10 | AI Block import (`importAiBlockAction`) | ✓ Accept → Inbox | - [ ] |
| 2.11 | Copy snapshot for ChatGPT (`/exchange`) | **Not in trades-preview** | - [ ] |
| 2.12 | AI notes panel (`/exchange`) | **Not in preview** | - [ ] |
| 2.13 | Worker reachability / sync status | `/system` only | - [ ] |
| 2.14 | Quick stats (best/worst trade, best playbook) | Highlights row in workspace | - [ ] |

---

## 3. Analytics & lab pages

| # | Route | Preview status | Box |
|---|-------|----------------|-----|
| 3.1 | `/playbook` | ✓ preview shell | - [ ] |
| 3.2 | `/review` | ✓ `PreviewReview` | - [ ] |
| 3.3 | `/stats` | ✓ `PreviewStats` | - [ ] |
| 3.4 | `/journal` | ✓ `PreviewJournal` | - [ ] |
| 3.5 | `/mistakes` | ✓ `PreviewMistakes` | - [ ] |

---

## 4. Pipeline & system (must stay reachable from preview nav)

| # | Legacy route | Core functionality | Reachable from preview nav? | Box |
|---|--------------|-------------------|----------------------------|-----|
| 4.1 | `/inbox` | Pending proposals list | ✓ mobile tab + sidebar | - [ ] |
| 4.2 | `/inbox/[id]` | Apply / reject | ✓ from alerts + inbox | - [ ] |
| 4.3 | `/system` | Sync to Worker, vault paths, tokens | ✓ sidebar | - [ ] |
| 4.4 | `/connect` | QR / mobile LAN | ✓ via `/system#connect` | - [ ] |
| 4.5 | `/exchange` | ✓ `PreviewExchange` — dark shell | - [ ] |

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
| 5.7 | All routes use preview shell | - [ ] |

---

## 6. Post-migration sign-off

| Gate | Box |
|------|-----|
| G.1 | Home preview data parity verified (section 1) | - [ ] |
| G.2 | Trades preview covers daily workflow (section 2) | - [ ] |
| G.3 | Inbox, system, exchange reachable from preview nav | - [ ] |
| G.4 | Trade detail/review work from preview tables | - [ ] |
| G.5 | Monthly risk tiles match `/system` rules | - [ ] |
| G.6 | `md/design/*` checklists signed off | - [ ] |

---

## Remaining concepts (not parity blockers)

See `md/concepts/deferred-matrixtrade.md`:

- Snapshot copy on New Trade workspace
- MT-IMPORT / MT-PLAN parsers
- AI Session revival
