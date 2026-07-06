# MatrixTrade — Home Preview Checklist Solutions

**Checklist:** [home-preview-checklist.md](home-preview-checklist.md)  
**Baseline commit:** (see git tag `home-preview/checklist-v1`)  
**Purpose:** How to verify, fix, or implement each checklist item.

Legend: **Status** = `Built` (code exists) · `Verify` (manual browser test) · `Gap` (known mismatch to fix)

---

## A. Shell & routing

| Item | Status | How to solve / verify |
|------|--------|------------------------|
| Full-viewport dark shell | Built | Open `/home-preview`. Confirm no `TradingNav`, no light `bg-zinc-50` wrapper. Files: `app/(trading)/home-preview/layout.tsx` (`fixed inset-0`), `(trading)/layout.tsx` (session only). |
| Preview layout scroll | Built | Scroll center column only; sidebars fixed. `SituationRoomDashboard` uses `overflow-y-auto` on center `div`. |
| Authentication | Built | `(trading)/layout.tsx` + **middleware** now includes `/home-preview` and all trading routes with `?next=` on login redirect. |
| Classic toggle (desktop header) | Built | Click “Classic dashboard →” in center header → `/`. `SituationRoomDashboard` line ~279. |
| Classic toggle (mobile) | Built | Resize &lt; `lg`, tap “Classic →” in top bar → `/`. |
| Classic toggle (sidebar footer) | Built | Desktop sidebar bottom link → `/`. |
| Classic entry from `/` | Built | `/` shows `DashboardViewSwitch` “Open Home preview” → `/home-preview`. |
| ARGUS corner hidden | Built | `ArgusCornerEntry` returns `null` when path starts with `/home-preview`. |
| Footer disclaimer | Built | Scroll center column bottom; copy in `footer` of dashboard. |

---

## B. Left sidebar (desktop `lg+`)

| Item | Status | How to solve / verify |
|------|--------|------------------------|
| Brand block | Built | Violet “M” + MatrixTrade in `aside` at `lg:flex`. |
| Dashboard active | Built | `NAV_MAIN` entry with `active: true` for `/home-preview`. |
| Trades → preview | Built | Link `/trades-preview`. |
| Playbooks / Review / Stats / Journal | Built | Links to classic `(nav)/` routes. **Verify:** each opens light shell with nav. |
| Inbox + badge | Built | Badge when `data.pendingInboxCount > 0` from `listAllPendingInboxItems`. **Verify:** create pending inbox item, refresh. |
| Assistant → `/exchange` | Built | `NAV_SYSTEM` link. |
| Settings → `/system` | Built | `NAV_SYSTEM` link. |
| Cycle progress block | Built | Label from `formatCycleLabel()` → `Experiment H001–H030`. |
| Sidebar hidden mobile | Built | `hidden lg:flex` on aside; mobile top bar at `lg:hidden`. |

---

## C. Center header

| Item | Status | How to solve / verify |
|------|--------|------------------------|
| Time-based greeting | Built | `greetingForHour()` in `situation-room.ts`; emoji in JSX. **Verify** at different times or temporarily mock hour. |
| Subtitle | Built | Static copy “Situation room · read-only briefing”. |
| Cycle badge | Built | Shows `data.cycleLabel (Current)`. Same **cycleLabel fix** as B. |
| + New Trade CTA | Built | Links `/trades-preview` only — no server action on click. **Verify:** no network POST on click. |

---

## D. Top summary KPIs

| Item | Status | How to solve / verify |
|------|--------|------------------------|
| Total P/L tone | Built | `pnlTone` from `summary.totalPnL`; `KpiCard` emerald/red. |
| Win rate + W/L | Built | `formatSituationPct` + `${wins}W / ${losses}L`. |
| Expectancy | Built | `computeExpectancy(trades)`; `—` when null. |
| Trades + risk left | Built | `tradesUsed/max` + loss budget sub. |
| Data matches classic `/` | Verify | Compare `experiment.realizedPnL`, win rate, closed count on classic dashboard vs preview. Both use `getExperiment()` + `getTrades()`. **If mismatch:** trace different filters in `ClassicDashboard` vs `buildSituationRoomData`. |

---

## E. Performance overview

| Item | Status | How to solve / verify |
|------|--------|------------------------|
| Title + subtitle | Built | Section header in dashboard. |
| Equity chart | Built | `DarkEquityChart` + `buildEquityCurve(trades)`. Needs ≥2 closed trades; else empty message. **Verify:** close 2+ trades or seed test data. |
| Zero baseline | Built | Gray horizontal line at `toY(0)` in SVG. |
| Best / worst day | Built | `dailyPnLStats()` aggregates closed trades by day. |
| Avg daily P/L | Built | Mean of daily totals. |
| Profit factor | Built | `computeProfitFactor(trades)` + `formatProfitFactor`. |

---

## F. Trade status (donut)

| Item | Status | How to solve / verify |
|------|--------|------------------------|
| Donut segments | Built | `TradeStatusDonut` — open, underReview, closed, remaining colors. |
| Center closed / max | Built | `data.closed` / `data.max`. |
| Legend matches sidebar | Verify | Compare donut legend to sidebar `tradesUsed/max` and segment counts. |
| Pending proposals row | Built | `tradeStatus.pendingProposals` from inbox count; optional **Pending trades** row for `status === "pending"`. |
| View all trades → | Built | Link to classic `/trades`. |

---

## G. Recent activity

| Item | Status | How to solve / verify |
|------|--------|------------------------|
| Closed trades table | Built | Up to 5 rows; columns match checklist. |
| Ticker links | Built | `/trades/[id]`. |
| P/L coloring | Built | emerald/red classes on P/L cell. |
| Empty state | Built | “No closed trades yet.” |
| Activity feed (6 events) | Built | `buildRecentActivity` → slice(0,6) in JSX. |
| Activity links | Built | `ev.href` on closed/review/logged events. Playbook events → `/playbook`. |

---

## H. Quick navigation

| Item | Status | How to solve / verify |
|------|--------|------------------------|
| All six pills | Built | `QUICK_NAV` array — click each, confirm destination. |

---

## I. Right panel (`xl+`)

| Item | Status | How to solve / verify |
|------|--------|------------------------|
| Panel at xl+ | Built | Right `aside` has `hidden xl:flex`. **Verify** at ≥1280px width. |
| Assistant workspace card | Built | Gradient card + copy + link. |
| Open assistant → | Built | `/exchange`. |
| Alerts header + badge | Built | Count badge when `alerts.length > 0`. |
| Alerts empty | Built | “All clear…” copy. |
| Alert items + severity | Built | `buildAlerts()` + colored dots + `href`. |
| Alert types | Verify | Trigger samples: exhaust loss budget, pending inbox, unreviewed close, bad playbook stats, open trade without stop. |
| Top playbooks | Built | Top 3 by net P/L from `computeAllPlaybookStats`. |
| Top playbooks empty | Built | Empty copy when none. |
| All playbooks → | Built | `/playbook`. |

---

## J. Read-only & pipeline rules

| Item | Status | How to solve / verify |
|------|--------|------------------------|
| No AI paste / import | Built | No textarea/import/apply in `SituationRoomDashboard`. Assistant only linked via right card → `/exchange`. |
| No auto-apply | Built | Page is server-rendered display only; no `actions.ts` on this route. |
| No trade create/edit | Built | “+ New Trade” is `<Link>` only. |
| Actions delegated | Built | Documented links: trades-preview, exchange, inbox. **Verify** user path end-to-end once. |

---

## K. Data freshness

| Item | Status | How to solve / verify |
|------|--------|------------------------|
| After closing trade | Built + Verify | Close a trade on classic flow → hard refresh `/home-preview` → KPIs/donut/table update. |
| After inbox apply | Built + Verify | Apply inbox item → refresh → inbox badge/alerts update. |
| Revalidation paths | Built | All trade/inbox mutations use `revalidateTradingPaths()` including `/home-preview` and `/trades-preview`. |

---

## L. Responsive

| Item | Status | How to solve / verify |
|------|--------|------------------------|
| Mobile &lt; lg | Verify | DevTools 375px: top bar, no sidebars, center scrolls. |
| Tablet lg–xl | Verify | ~1024px: left sidebar yes, right panel no. |
| Desktop xl+ | Verify | ≥1280px: three columns. |

---

## Priority fixes (from gaps above)

| # | Fix | Status |
|---|-----|--------|
| 1 | Middleware `next` param — preview + trading routes in `isTradingRoute()` | **Done** — `middleware.ts` |
| 2 | Cycle label — `formatCycleLabel()` → `Experiment H001–H030` | **Done** — `lib/experiment-label.ts` |
| 3 | Donut pending — `pendingProposals` from inbox + “Pending trades” row | **Done** — `situation-room.ts`, `SituationRoomDashboard.tsx` |
| 4 | Revalidation audit — AI notes/session actions use `revalidateTradingPaths()` | **Done** — `app/actions.ts` |

User still verifies each checklist box in [home-preview-checklist.md](home-preview-checklist.md).

## Changelog

| Date | Commit | Change |
|------|--------|--------|
| 2026-07-06 | `home-preview/checklist-v1` | Initial solutions doc |
| 2026-07-06 | (this commit) | Implemented four priority code fixes |

---

## Sign-off procedure

1. Deploy baseline tag to production.
2. Log in at https://matrix-trade-theta.vercel.app/home-preview
3. Walk sections A→L; check box in [home-preview-checklist.md](home-preview-checklist.md)
4. Log failures in Sign-off table; fix gaps above; bump checklist changelog.
