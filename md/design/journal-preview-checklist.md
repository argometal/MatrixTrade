# MatrixTrade — Journal Design Checklist

**Route:** `/journal` (dark preview shell)  
**Production:** https://matrix-trade-theta.vercel.app/journal  
**Last design version:** 2026-07-08 (journal moved to preview shell)  
**Component:** `PreviewJournal` · Data: `getTrades()` + `getPlaybooks()`  
**Source files:** `app/components/journal-preview/PreviewJournal.tsx` · `app/(trading)/(preview)/journal/`

Use this list after every deploy or redesign. Check each box only after you have **seen it work** in the browser.

**Process:** See [`md/design/README.md`](README.md). Agent updates this file whenever Journal preview code changes.

## Changelog

| Date | Commit | Change |
|------|--------|--------|
| 2026-07-08 | — | Journal converted from classic light `(nav)` layout to dark `PreviewShell` |

---

## A. Shell & routing

- [ ] **Full-viewport dark shell** — Edge-to-edge dark UI with persistent preview sidebar.
- [ ] **Preview layout** — `PreviewShell` wraps content; scroll inside main column.
- [ ] **Authentication** — Logged-out → login; logged-in → journal list.
- [ ] **Sidebar — Journal active** — Journal nav item highlighted (violet) on `/journal`.

---

## B. Header & actions

- [ ] **Title** — “Journal” + trading log subtitle.
- [ ] **Review queue link** — Header button links to `/review`; shows pending count when &gt; 0.
- [ ] **All trades link** — Header button links to `/trades`.
- [ ] **Summary line** — Closed trade count + pending review count when trades exist.

---

## C. Closed trades log

- [ ] **Empty state** — “No closed trades yet.” when none.
- [ ] **Trade cards** — Each closed trade shows ID, ticker, date, playbook, P/L, review status.
- [ ] **Trade links** — ID/ticker links to `/trades/[id]`.
- [ ] **P/L coloring** — Green wins, red losses.
- [ ] **Review pending** — Amber link to `/trades/[id]/review` when not reviewed.
- [ ] **Mistakes** — Mistake labels shown when present.
- [ ] **Lessons** — `lesson`, `lessons`, and `actionItem` fields displayed.
- [ ] **Sort order** — Most recently closed first.

---

## D. Footer navigation

- [ ] **Review queue →** — Links to `/review`.
- [ ] **All trades →** — Links to `/trades`.
- [ ] **Statistics →** — Links to `/stats`.

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Design / UX | | | |
| Functionality | | | |
| Production URL verified | | | |
