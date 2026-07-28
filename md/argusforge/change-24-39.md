# CHANGE 24-39 — Chaos Deck capture & recovery

**Status:** Implemented (draft PR)  
**Route:** `/forge/deck/[deckId]`  
**Code:** `DeckInternalView` · `DeckCaptureComposer` · `af03-deck-search.ts`

## Intent

Chaos Deck is a **capture + find + review** space for one Deck — not a record-manager form.

| Surface | Role |
|---------|------|
| Chaos Dumping (`+`) | Capture quickly (any destination) |
| Chaos Deck | Capture into this Deck, find, and review |
| Argus | Link |

## Changes

### 1. Optional title

- No title modal on capture.
- Title = first useful line (`titleFromDump`) or `Untitled note`.
- Rename later via Fragment `•••` → Rename.

### 2. Classic capture (same pattern as Dumping)

- Compact capture box · `+ Add image` · Save · Expand (fullscreen, one draft).
- Destination fixed to the current Deck (no alternate lower form).
- `CreationMenu` removed as primary entry; stubs (link / builder) remain in Deck `•••`.

### 3. Full-content search

Placeholder: **Search this Deck…**

Literal match across:

- title · body · block text · links/`sourceRef` · asset filenames · tags  
Filters the **entire** Deck. Instant. Clear restores all. List/Grid preserved. Matches highlighted.

### 4. Grid redesign

- Two columns on mobile.
- Compact cards, higher-contrast title, 3–5 line preview (~15px).
- Card surface lighter than canvas; no primary TEXT kind badge.
- Optional image thumbnail; selection + `•••` stay small.

List remains for detailed admin / search review.

## Out of scope

Semantic search · new ontology · merging 24-2E dump image pipeline wholesale · auto-linking.
