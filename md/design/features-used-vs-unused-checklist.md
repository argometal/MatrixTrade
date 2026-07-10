# MatrixTrade — Features in Use vs Built but Unused

**Purpose:** Audit what exists in code vs what is exposed and used in the current UI.  
**Last design version:** 2026-07-08  
**Companion:** [legacy-vs-preview-map.md](legacy-vs-preview-map.md) · [new-mode-parity-checklist.md](new-mode-parity-checklist.md)  
**Process:** See [README.md](README.md) — user checks boxes after verifying in browser.

## Changelog

| Date | Change |
|------|--------|
| 2026-07-09 | Planning `/planning` Phase 0 — storage, dashboard, AI snapshot |
| 2026-07-08 | Initial used-vs-unused feature audit |

---

## Features in use

Verify each item in production or local.

### 1. Routes & pages

| Feature | Route | Shell | Nav | Status | Notes |
|---------|-------|-------|-----|--------|-------|
| Dashboard | `/home-preview` | Preview dark | Sidebar + mobile tab | Used | `/` redirects here |
| New Trade | `/trades-preview` | Preview dark | Sidebar + mobile tab | Used | Assistant + traditional entry → Inbox |
| Trades list | `/trades` | Preview dark* | Sidebar | Used* | *Preview conversion in progress locally |
| Journal | `/journal` | Preview dark* | Sidebar | Used* | *Preview conversion in progress locally |
| Playbook | `/playbook` | Preview dark* | Sidebar | Used* | *Preview conversion in progress locally |
| Planning | `/planning` | Preview dark | Sidebar | Used | Pre-trade plans, auto-expire, strategy evaluation |
| System | `/system` | Preview dark* | Sidebar | Used* | *Preview conversion in progress locally |
| Inbox list | `/inbox` | Classic light | Sidebar + mobile tab | Used | Apply/reject on detail |
| Inbox detail | `/inbox/[id]` | Classic light | From inbox | Used | |
| Assistant | `/exchange` | Classic light | Sidebar | Used | Snapshot copy + AI block import |
| Stats | `/stats` | Classic light | Sidebar | Used | No preview variant |
| Review hub | `/review` | Classic light | Sidebar | Used | Attention queue |
| Mistakes | `/mistakes` | Preview dark | Sidebar | Used | Mistake tags from reviews |
| Trade detail | `/trades/[id]` | Classic light | Link only | Used | Open/close/meta |
| Trade review | `/trades/[id]/review` | Classic light | Link only | Used | |
| Classic create | `/trades/new` | Classic light | Sidebar | Used | Direct `createTradeAction` |
| Connect | `/connect` | Redirect | Sidebar | Used | → `/system#connect` |
| Login | `/login` | Auth | — | Used | Default `next=/home-preview` |

- [ ] All "Used" routes load without error after login
- [ ] Preview routes use dark `PreviewShell` (desktop sidebar)
- [ ] Remaining classic routes use light card layout

### 2. Server actions — wired to UI

| Action | Wired from | Status |
|--------|------------|--------|
| `importAiBlockAction` | `/exchange`, `/trades-preview` | Used |
| `syncBridgeFormAction` | `/system` | Used |
| `applyInboxItemAction` / `rejectInboxItemAction` | `/inbox/[id]` | Used |
| `createTradeAction` | `/trades/new` | Used |
| `openTradeAction` / `closeTradeAction` / `updateTradeMetaAction` | `/trades/[id]` | Used |
| `saveReviewAction` | `/trades/[id]/review` | Used |

- [ ] Import AI block reaches Inbox from Exchange and New Trade
- [ ] Sync on System publishes snapshot to worker

### 3. Bridge / worker pipeline

| Capability | UI entry | Status |
|------------|----------|--------|
| Publish snapshot | `/system` sync | Used |
| Fetch worker inbox | Inbox, Review, nav badge, Dashboard | Used |
| Submit proposal | `importAiBlockAction` | Used |
| Apply / reject | Inbox detail | Used |
| External POST | `/api/trading/inbox` | Used (automation, no UI) |

- [ ] Pending inbox badge on mobile tab and sidebar

### 4. Preview migration status

| Screen | Preview? | Route |
|--------|----------|-------|
| Dashboard | ✓ | `/home-preview` |
| New Trade | ✓ | `/trades-preview` |
| Trades | ✓* | `/trades` |
| Journal | ✓* | `/journal` |
| Playbook | ✓* | `/playbook` |
| System | ✓* | `/system` |
| Inbox | — | `/inbox` |
| Stats / Review / Exchange | — | classic |
| Mistakes | ✓ | `/mistakes` preview |
| Trade detail / review / new form | — | classic |

\* Local preview components exist; may not be on production until committed/deployed.

- [ ] Dark shell consistent across converted screens

### 5. Mobile navigation

| Entry | Status |
|-------|--------|
| Bottom tabs: Dashboard, New Trade, Inbox | Used |
| Hamburger: full `PREVIEW_NAV_SECTIONS` | Used |
| Trade detail | Link-only (from tables) |

- [ ] Hamburger lists all sections with inbox badge when pending

---

## Features built but not used / underused

### 1. Orphaned or disabled server actions

| Action | Status | Notes |
|--------|--------|-------|
| `saveAiNotesAction` | **Unused** | No UI mounts `PasteAiNotesPanel` |
| `createAiSessionAction` | **Disabled** | `AI_SESSION_DISABLED = true` |
| `revokeAiSessionAction` | **Disabled** | No UI |

- [ ] Confirm no UI exposes AI Session or Paste Notes save

### 2. Orphaned / deprecated components

| Component | Status | Notes |
|-----------|--------|-------|
| `SituationRoomDashboard` | **Unused** | Replaced by `PreviewDashboard` |
| `loadSituationRoomData` | **Unused** | No page imports |
| `TradesViewSwitch` | **Unused** | Classic `/trades` page removed locally |
| `BridgeSyncPanel` | **Unused** | Superseded by `SystemBridgePanel` |
| `PasteAiNotesPanel` | **Unused** | Never mounted |
| `AiSessionPanel` | **Unused** | Disabled by design |
| `AiBlockPanel` / `AiBridgeMain` | **Deprecated** | Re-export wrappers |

- [ ] None appear in active page import chains

### 3. API routes with no UI consumer

| Route | Status |
|-------|--------|
| `/api/ai/*` | Disabled (503) — AI Session blocked |
| `/api/trading/inbox` | External token POST only |

### 4. Gaps — partial coverage

| Gap | Status | Notes |
|-----|--------|-------|
| Snapshot copy on New Trade | **Missing** | Full copy only on `/exchange` |
| AI notes save UI | **Missing** | Notes read into snapshot only |
| Preview shell for Stats / Review / Exchange | **Missing** | Still classic |
| Trade open/close in preview | **Missing** | Classic detail only |
| Direct create in preview | **By design** | Proposals → Inbox only |
| Classic dashboard `/?classic=1` | **Retire candidate** | User requested removal; Dashboard is `/home-preview` |

- [ ] Daily workflow completable: preview → classic detail → inbox apply

---

## Quick reference — top unused items

1. **AI Session + QR** — actions exist, UI removed, APIs return 503  
2. **Paste AI Notes** — save action exists, no panel wired  
3. **Situation Room dashboard** — old component superseded by Dashboard  
4. **TradesViewSwitch** — classic/preview toggle obsolete after migration  
5. **Snapshot copy** — only on Exchange, not on New Trade workspace
