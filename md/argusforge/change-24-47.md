# CHANGE 24-47 — ArgusForge consolidation, trimming, and alignment

**Status:** Pending (draft PR)  
**Branch strategy:** Integration branch from `main`, folding draft #108 (24-2E images) and #112 (24-39 Deck). #110 (Recent linkage) left separate — Argus-only.

## Goal

- One capture engine (Dumping + Deck)
- Canonical visible ontology
- Stronger mobile legibility
- Less technical UI
- Aligned Markdown / UI / code

Not in scope: new major surfaces, new ontology, AI, Argus redesign, premature deletion of persisted kinds.

## Surfaces (audit summary)

| Surface | Capture | Notes |
|---------|---------|-------|
| Chaos Dumping | Shared `persistChaosDumpCapture` | Destination picker |
| Chaos Deck | Same engine via `DeckCaptureComposer` | Fixed destination |
| Knowledge Explorer / Home | Structure + filters | Empty in filter group |
| Viewer / Classic / Builder | Modes of same Fragment | Entity breadcrumbs |
| Argus / Realm / Vault | Untouched functionally | Secondary Focus/Active/Archive bar removed |

## Capture engine

Shared module: `lib/argusforge/af03-chaos-dump-images.ts`

- Draft text + images · validation · limits · transactional persist · cleanup · undo
- Success only when assets + Fragment + Blocks persist
- On failure: keep draft, no success flash, clean partial assets

## Deprecated primary actions

- Add text / Add link / Add image URL → Classic Capture
- Image URL records remain readable (deprecated UI)

## Limited (secondary)

- File reference · PDF reference (stubs)
- Structured Fragment (Builder)

## Ontology

Visible: Realm → Folder → Chaos Deck → Fragment → Block  
Labels: `af03-visible-ontology.ts`  
Breadcrumbs: `af03-entity-path.ts` + `EntityLocationNav`

## Home / shell

- Filters: All · Active · Archive · Empty · Sort
- Removed persistent Focus/Active/Archive bottom bar
- Level snapshot counts actionable
- Recently opened: Open · Move · Rename · Archive

## Docs

- `md/argusforge/capability-map.md`
- This change doc
- Handoff: **Pending** only until merge + prod verify
