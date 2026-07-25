# CHANGE 24-1E — Home Explorer priority; Argus preserved experimental

**Status:** Implemented  
**Date:** 2026-07-25  
**PR:** MatrixTrade #76  

---

## Decision

Refocus ArgusForge around current operational value.

| Priority | Surface |
|----------|---------|
| 1 | Chaos Builder |
| 2 | **Home Explorer** (this change) |
| 3 | Alexandria Legacy validation bridge |
| 4 | Real usage and evidence collection |
| 5 | Argus refinement **later** |

Argus remains accessible as an **experimental relational laboratory**.  
Do not remove it. Do not redesign Treemap/molecular/formulas in this change.

### Why Argus is paused

Argus lacks enough real usage data to finalize its interaction model. Missing signals include: sufficient explicit relations; recurrence history; Alexandria test results; affinity evidence; real Deck/Fragment volume; validated decisions improved by the graph.

Therefore: preserve architecture → collect real data → revisit after evidence exists.  
Current Argus design is **not** final.

---

## Home role

Home is the primary traditional **Explorer** for managing knowledge:

Realm → Chaos Deck → Fragment → Block  

Capabilities: find, open, create, organize, move, rename, archive, restore, search, sort, filter, access Chaos Builder.

Overview metrics are **secondary** (collapsible).

---

## Delivered

- `HomeExplorer` on `/forge` with search, status/content filters, sort, breadcrumbs, Realm/Deck rows, builder signals, recent strip, collapsible overview  
- Deck back-link → Home Explorer Realm context  
- Argus labeled Experimental / Preview (shell + Treemap + units) — no new graph behavior  
- Shared query helpers: `af03-home-explorer.ts`  
- `/forge/active` and `/forge/archive` remain for compatibility  

## Not in this change

Alexandria adapter · new Argus visuals/formulas · Focus intelligence · permanent delete · fake Alexandria statuses (show “Not tested” only)
