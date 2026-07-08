# MatrixTrade — Dashboard Design Checklist

**Route:** `/home-preview` (primary Dashboard; `/` redirects here)  
**Production:** https://matrix-trade-theta.vercel.app/home-preview  
**Last design version:** 2026-07-08 (Dashboard parity with classic `/`)  
**Component:** `PreviewDashboard` · Data: `loadDashboardData()`  
**Source files:** `app/components/dashboard/PreviewDashboard.tsx` · `lib/dashboard-data.ts` · `app/(trading)/(preview)/home-preview/`

Use this list after every deploy or redesign. Check each box only after you have **seen it work** in the browser with real (or test) cycle data.

**Process:** See [`md/design/README.md`](README.md). Agent updates this file whenever Home preview code changes.

## Changelog

| Date | Commit | Change |
|------|--------|--------|
| 2026-07-06 | `c588a11` | Checklist docs + agent rule saved |
| 2026-07-06 | `home-preview/checklist-v1` tag | Baseline solutions doc — verification starting point |
| 2026-07-06 | `618c6b3` | Implemented priority fixes: middleware routes, cycle label, donut pending proposals, revalidation consolidation |

| 2026-07-07 | `d28cb58` | Restore ARGUS corner icon on preview routes |

| 2026-07-07 | `96918be` | Persistent preview sidebar with full TradingNav links |

**User sign-off:** All boxes stay unchecked until you verify in the browser.

---

## A. Shell & routing

- [ ] **Full-viewport dark shell** — Page fills the screen edge-to-edge (no light `TradingNav`, no rounded card inside a light page).
- [ ] **Preview layout** — `fixed inset-0` dark background; content scrolls inside panels, not the whole browser chrome.
- [ ] **Authentication** — Logged-out users redirect to login; logged-in users land on Situation Room.
- [ ] **Classic toggle (desktop header)** — “Classic dashboard →” in center header links to `/`.
- [ ] **Classic toggle (mobile)** — Top bar “Classic →” links to `/`.
- [ ] **Classic toggle (sidebar footer)** — “Classic dashboard →” links to `/`.
- [ ] **Classic entry from `/`** — “Open Home preview” on classic dashboard opens `/home-preview`.
- [ ] **ARGUS corner visible** — Teal/violet ARGUS icon top-right on all MatrixTrade pages (including previews); hidden only on `/argus/*`.
- [ ] **Footer disclaimer** — Bottom line reads live-data / v2 preview / human-actions-first messaging.

---

## B. Left sidebar (desktop `lg+`) — persistent preview shell

- [ ] **Brand block** — Violet “M” logo + “MatrixTrade” label (links to `/home-preview`).
- [ ] **Main nav — Dashboard (classic)** — Links to `/`.
- [ ] **Main nav — Home preview** — Links to `/home-preview`; active on this route.
- [ ] **Main nav — New Trade** — Links to `/trades-preview`.
- [ ] **Main nav — Playbook** — Links to `/playbook` (classic).
- [ ] **Main nav — Review** — Links to `/review` (classic).
- [ ] **Main nav — Statistics** — Links to `/stats` (classic).
- [ ] **Main nav — Journal** — Links to `/journal` (classic).
- [ ] **System nav — Assistant** — Links to `/exchange`.
- [ ] **System nav — Inbox** — Links to `/inbox`; badge shows pending count when &gt; 0.
- [ ] **System nav — System** — Links to `/system`.
- [ ] **New trade** — Footer button links to `/trades/new`.
- [ ] **Sign out** — Footer sign-out action works.
- [ ] **Cycle progress block** — Shows cycle label (`Experiment H001–H030`), trades used / max, progress bar, loss budget remaining.
- [ ] **Sidebar persistent** — Same menu visible on `/home-preview` and `/trades-preview` (layout shell).
- [ ] **Sidebar hidden on mobile** — Left nav not shown below `lg`; mobile top bar used instead.

---

## C. Center header

- [ ] **Time-based greeting** — “Good morning / afternoon / evening” + sun emoji.
- [ ] **Subtitle** — “Situation room · read-only briefing”.
- [ ] **Cycle badge** — Experiment label with “(Current)” (e.g. `Experiment H001–H030 (Current)`).
- [ ] **+ New Trade CTA** — Violet button links to `/trades-preview` (not direct Supabase write).

---

## D. Top summary KPIs (4 cards)

- [ ] **Total P/L (this cycle)** — Dollar value; green if ≥ 0, red if &lt; 0; sub “Am I winning?”.
- [ ] **Win rate** — Percentage; sub shows `W / L` counts.
- [ ] **Expectancy** — Per closed trade; green/red tone; shows `—` when no data.
- [ ] **Trades** — `used / max`; sub shows remaining loss budget / risk left.
- [ ] **Data matches cycle** — Numbers align with classic `/` stats for the same experiment.

---

## E. Performance overview

- [ ] **Section title + subtitle** — “Performance overview” / experiment trend copy.
- [ ] **Equity chart** — Violet line + points when ≥ 2 closed trades; empty state when none.
- [ ] **Zero baseline** — Horizontal reference line on chart.
- [ ] **Best day** — Largest daily P/L in cycle (or `—`).
- [ ] **Worst day** — Smallest daily P/L in cycle (or `—`).
- [ ] **Avg daily P/L** — Mean of daily totals (or `—`).
- [ ] **Profit factor** — Formatted PF from closed trades (or `—` / N/A).

---

## F. Trade status (donut)

- [ ] **Donut segments** — Open (green), pending reviews (amber), closed (violet), remaining (gray).
- [ ] **Center label** — Closed count / max trades in cycle.
- [ ] **Legend counts** — Each segment value matches sidebar cycle math.
- [ ] **Pending proposals row** — Shown when inbox has pending proposals (`pendingProposals` &gt; 0); separate **Pending trades** row when trade status is pending.
- [ ] **View all trades →** — Links to classic `/trades`.

---

## G. Recent activity

- [ ] **Closed trades table** — Columns: Ticker, Type, Playbook, Entry, Exit, P/L, R, Date.
- [ ] **Ticker links** — Each row links to `/trades/[id]` (classic detail).
- [ ] **P/L coloring** — Green wins, red losses.
- [ ] **Empty state** — “No closed trades yet.” when none.
- [ ] **Activity feed (below table)** — Up to 6 recent events (closed, reviewed, logged, playbook).
- [ ] **Activity links** — Linked events navigate to trade/review/playbook routes.

---

## H. Quick navigation (center footer)

- [ ] **New Trade pill** → `/trades-preview`
- [ ] **Review pill** → `/review`
- [ ] **Inbox pill** → `/inbox`
- [ ] **Statistics pill** → `/stats`
- [ ] **Playbooks pill** → `/playbook`
- [ ] **Assistant workspace pill** → `/exchange`

---

## I. Right panel (desktop `xl+`)

- [ ] **Panel visible** — Right column shown at `xl` breakpoint; hidden on smaller widths.
- [ ] **Assistant workspace card** — Gradient violet card; copy explains actions live on `/exchange`.
- [ ] **Open assistant workspace →** — Button links to `/exchange`.
- [ ] **Alerts — header** — Title + red count badge when alerts exist.
- [ ] **Alerts — empty** — “All clear — nothing requires action.” when none.
- [ ] **Alerts — items** — Severity dots (red / amber / sky); each links to relevant route.
- [ ] **Alert types (sample)** — Loss budget exhausted/low, inbox pending, reviews due, underperforming playbook.
- [ ] **Top playbooks** — Name, win %, trade count, P/L per playbook (top performers this cycle).
- [ ] **Top playbooks empty** — “No closed playbook stats yet.” when none.
- [ ] **All playbooks →** — Links to `/playbook`.

---

## J. Read-only & pipeline rules (must NOT happen here)

- [ ] **No AI paste / import on dashboard** — No snapshot copy, no AI Block textarea, no Apply button on this page.
- [ ] **No auto-apply** — Nothing writes to Supabase from Home preview alone.
- [ ] **No trade create/edit** — “+ New Trade” only navigates away; no inline trade form.
- [ ] **Actions delegated** — Trade execution → `/trades-preview`; Assistant → `/exchange`; Approvals → `/inbox`.

---

## K. Data freshness

- [ ] **After closing a trade** — Refresh Home preview; KPIs, donut, recent table update.
- [ ] **After inbox apply** — Pending counts and alerts update on refresh.
- [ ] **Revalidation paths** — Server actions that mutate trades/inbox revalidate `/home-preview`.

---

## L. Responsive smoke test

- [ ] **Mobile (`&lt; lg`)** — Top bar + **persistent bottom nav** (Home, Trades, Assist, Inbox, More); content clears bottom bar.
- [ ] **Mobile default dashboard** — Visiting `/` on phone redirects to `/home-preview`; login lands on Home preview.
- [ ] **Mobile bottom nav on classic routes** — Inbox, Playbook, etc. still show bottom nav when opened from phone.
- [ ] **Tablet (`lg`, not `xl`)** — Left sidebar visible; right panel hidden; no bottom nav.
- [ ] **Desktop (`xl+`)** — Three-column layout: sidebar + center + right panel.

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Design / UX | | | |
| Functionality | | | |
| Production URL verified | | | |

**Redesign rule:** Copy this file to `home-preview-checklist-vN.md` or reset all `[ ]` and update “Last design version” when the mockup changes.
