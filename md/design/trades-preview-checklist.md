# MatrixTrade — New Trade Design Checklist

**Route:** `/trades-preview` (labeled **New Trade** in nav; URL unchanged)  
**Production:** https://matrix-trade-theta.vercel.app/trades-preview  
**Last design version:** 2026-07-08 (rename Trades preview → New Trade)  
**Last design version:** 2026-07-06 (commit `7036a85`)  
**Component:** `TradesWorkspace` · Data: `loadTradesWorkspaceData()`  
**Source files:** `app/components/trades-preview/TradesWorkspace.tsx` · `lib/trades-workspace.ts` · `app/(trading)/trades-preview/`

Use this list after every deploy or redesign. Check each box only after you have **seen it work** in the browser.

**Process:** See [`md/design/README.md`](README.md). Agent updates this file whenever Trades preview code changes.

## Changelog

| Date | Commit | Change |
|------|--------|--------|
| 2026-07-06 | `7036a85` | Initial checklist — full-viewport trades workspace |

---

## A. Shell & routing

- [ ] **Full-viewport dark shell** — Edge-to-edge dark UI (no light `TradingNav`).
- [ ] **Preview layout** — `fixed inset-0`; scroll inside main column.
- [ ] **Authentication** — Logged-out → login; logged-in → workspace.
- [ ] **Classic toggle (mobile)** — Top bar “Classic →” links to `/trades`.
- [ ] **Trades toggle (sidebar)** — “Trades →” links to `/trades`.
- [ ] **Trades list** — `/trades` uses dark preview shell with trades table.
- [ ] **ARGUS corner hidden** — No ARGUS button on this route.

---

## B. Left sidebar (desktop `lg+`)

- [ ] **Brand block** — M logo + MatrixTrade.
- [ ] **Main nav — Dashboard** → `/home-preview`.
- [ ] **Main nav — Trades** — Active (violet) on `/trades-preview`.
- [ ] **Main nav — Playbooks / Review / Statistics / Journal** — Link to classic routes.
- [ ] **Cycle footer** — Trades used / max this cycle + classic link.

---

## C. Header & tabs

- [ ] **Title** — “Trades” + assistant/traditional subtitle.
- [ ] **Import / Add Trade** → `/exchange`.
- [ ] **+ New Trade (classic)** → `/trades/new`.
- [ ] **Tabs** — New Trade, Open, Pending, Closed, All Trades (counts in labels).
- [ ] **Tab filtering** — My Trades table filters correctly per tab.

---

## D. Trade Assistant

- [ ] **Natural language textarea** — Editable; placeholder visible.
- [ ] **Quick prompt chips** — Fill textarea on click.
- [ ] **Copy for Assistant** — Copies text; shows “✓ Copied…” feedback.
- [ ] **Paste AI Block** — On blur, parses block → Assistant Proposal section.
- [ ] **No direct Supabase write** — Copy/paste only prepares proposal.

---

## E. Traditional Entry

- [ ] **Fields** — Trade ID, Ticker, Direction (long/short), Entry, Stop, Target, Shares, Playbook, Notes.
- [ ] **Direction toggle** — Visual active state.
- [ ] **Clear form** — Resets fields.
- [ ] **Review Trade →** — Builds proposal JSON → Assistant Proposal panel.

---

## F. Assistant Proposal

- [ ] **Empty state** — Dashed box when no proposal.
- [ ] **Parsed preview** — Ticker, entry/stop/target, R multiple, thesis when present.
- [ ] **Editable JSON** — Textarea shows full AI Block / proposal.
- [ ] **Regenerate** — Clears proposal.
- [ ] **Accept Proposal → Inbox** — Calls `importAiBlockAction`; success message + link to `/inbox/[id]`.
- [ ] **Parse errors** — Red error when JSON invalid.
- [ ] **No auto-apply** — Accept goes to Inbox only, not Supabase.

---

## G. My Trades table

- [ ] **Search** — Filters by ticker/id.
- [ ] **Columns** — Ticker, Status, Direction, Entry, P/L or risk, Playbook, Actions.
- [ ] **Row links** — Navigate to classic trade detail where applicable.
- [ ] **Empty states** — Per tab when no rows.

---

## H. Right panel (`xl+`)

- [ ] **Quick actions** — Prefill assistant text + switch to New tab.
- [ ] **Open trades summary** — Positions, risk, link to trade ids.
- [ ] **Trade insights** — Best/worst, highest R, win rate, expectancy (cycle).
- [ ] **Recent closed** — Last closed trades with P/L coloring.

---

## I. Pipeline rules

- [ ] **Proposal → Inbox → Review → Apply** — Accept never skips Inbox.
- [ ] **Home preview stays read-only** — Operational actions live here or `/exchange`.
- [ ] **Classic paths preserved** — `/trades`, `/trades/new`, `/trades/[id]` still work.

---

## J. Data freshness

- [ ] **After Accept** — Inbox item appears; link works.
- [ ] **After trade changes elsewhere** — Refresh updates My Trades and summaries.
- [ ] **Revalidation** — Mutations revalidate `/trades-preview` where configured.

---

## K. Responsive

- [ ] **Mobile** — Top bar; no sidebars; main scrolls.
- [ ] **Desktop xl+** — Left nav + center grid + right insights column.

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Design / UX | | | |
| Functionality | | | |
| Production URL verified | | | |
