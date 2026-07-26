# CHANGE 24-22 — Simplify `+` into fullscreen Chaos Dumping

**Status:** Implemented  
**Route:** `/forge/chaos` (bottom nav `+`)

## Intent

`+` is a lightweight Chaos dump: paste/write → optional destination → Save to Chaos.  
Not a builder, not Library Alexandria, not Argus enrichment.

## Removed from main capture UI

- Project (optional mock)
- Why does this matter?
- Optional Task/Vault context
- Large Image/File Soon buttons
- Session-only prototype banner as primary chrome
- Bottom `+` create sheet (New Deck / New Realm) — moved to small secondary links on the dump screen

## Fullscreen editor

Expand control on the Material card opens a portal overlay (`Back to +` / `Done`).  
Draft text and destination survive expand/collapse.

## Destination

Default **Chaos Inbox** (seed `Inbox scraps` renamed on first dump).  
Optional: any active Chaos Deck by title. Last destination remembered in `localStorage`.

## Save

`createContent` into the selected deck (text or link). Confirmation: Saved · Open · Move · Undo.
