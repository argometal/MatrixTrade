# CHANGE 24-23 — Refine Home Explorer visual hierarchy

**Status:** Implemented  
**Route:** `/forge` (Home)

## Intent

Home stays the operational Explorer. Visual refinement only — search and contents first; metrics secondary as a compact line + collapsed overview.

## Highlights

- Compact prototype disclosure (`Local prototype · browser storage · details`)
- Header: Home · Explorer + summary line + `+` create menu
- Unified search field (debounced + Enter)
- Status chips: All / Active / Archive / Empty + compact sort
- Row metadata without repeated “Export ready”
- Status badges only in All/Empty views
- Recently opened (≤3) instead of duplicate Recent Decks list
- Empty states for empty repo / no matches
