# MatrixTrade — Features in Use vs Built but Unused

**Purpose:** Runtime audit — what exists in code vs what is exposed in the UI.  
**Last design version:** 2026-07-10  
**Companion:** [legacy-vs-preview-map.md](legacy-vs-preview-map.md) · [new-mode-parity-checklist.md](new-mode-parity-checklist.md)  
**Process:** See [README.md](README.md) — user checks boxes after verifying in browser.

## Changelog

| Date | Change |
|------|--------|
| 2026-07-10 | All routes on preview shell; carryover toggle; close date edit; features audit refresh |
| 2026-07-09 | Planning `/planning` Phase 0 |
| 2026-07-08 | Initial used-vs-unused feature audit |

---

## Features in use

### 1. Routes & pages

| Feature | Route | Shell | Nav | Status |
|---------|-------|-------|-----|--------|
| Dashboard | `/home-preview` | Preview dark | Sidebar + mobile tab | Used |
| New Trade | `/trades-preview` | Preview dark | Sidebar + mobile tab | Used |
| Trades list | `/trades` | Preview dark | Sidebar | Used |
| Journal | `/journal` | Preview dark | Sidebar | Used |
| Playbook | `/playbook` | Preview dark | Sidebar | Used |
| Planning | `/planning` | Preview dark | Sidebar | Used |
| Mistakes | `/mistakes` | Preview dark | Sidebar | Used |
| System | `/system` | Preview dark | Sidebar | Used |
| Inbox | `/inbox`, `/inbox/[id]` | Preview dark | Sidebar + mobile tab | Used |
| Exchange | `/exchange` | Preview dark | Sidebar | Used |
| Stats | `/stats` | Preview dark | Sidebar | Used |
| Review | `/review` | Preview dark | Sidebar | Used |
| Trade detail | `/trades/[id]` | Preview dark | Link | Used |
| Trade review | `/trades/[id]/review` | Preview dark | Link | Used |
| Classic create | `/trades/new` | Preview dark | Sidebar | Used |
| Connect | `/connect` | Redirect | — | Used |
| Login | `/login` | Auth | — | Used |

- [ ] All routes load without error after login
- [ ] Dark `PreviewShell` consistent across trading routes

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
| External POST | `/api/trading/inbox` | Used (automation) |

### 4. Monthly risk

| Feature | Location | Status |
|---------|----------|--------|
| Carryover toggle | `/system` Experiment rules | Used |
| Close date edit | `/trades/[id]` | Used |
| Monthly room cap tile | Dashboard | Used |

---

## Built but not used / underused

### 1. Orphaned server actions

| Action | Status | Concept doc |
|--------|--------|-------------|
| `saveAiNotesAction` | Unused | `concepts/deferred-matrixtrade.md` §5 |
| `createAiSessionAction` | Disabled | `concepts/deferred-matrixtrade.md` §4 |
| `revokeAiSessionAction` | Disabled | `concepts/deferred-matrixtrade.md` §4 |

### 2. Legacy components (preserved, not mounted)

| Component | Path |
|-----------|------|
| Stats, Review, Exchange, Trade detail/review/new | `app/components/legacy/Legacy*.tsx` |
| Old nav layout | `app/(trading)/(nav)/layout.legacy.tsx` |
| `SituationRoomDashboard` | Superseded by `PreviewDashboard` |
| `TradesViewSwitch` | Obsolete after migration |
| `PasteAiNotesPanel` | Never mounted |

### 3. Gaps — deferred concepts

| Gap | Doc |
|-----|-----|
| Snapshot copy on New Trade | `concepts/deferred-matrixtrade.md` §6 |
| AI notes save UI | `concepts/deferred-matrixtrade.md` §5 |
| MT-IMPORT parser | `protocols/import-handoff-v1.md` |
| Classic runtime toggle | `concepts/deferred-matrixtrade.md` §8 |

---

## Quick reference — top unused items

1. **AI Session + QR** — disabled by design  
2. **Paste AI Notes** — save action exists, no panel  
3. **Legacy page components** — preserved for reference only  
4. **Snapshot copy** — only on Exchange, not New Trade workspace
