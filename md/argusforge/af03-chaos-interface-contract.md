# ARGUSFORGE 03 — CHAOS INTERFACE CONTRACT & COMPLETION CHECKLIST

**Official name:** AF03 — CHAOS INTERFACE CONTRACT & COMPLETION CHECKLIST  
**Status:** Working contract — implementation checklist  
**Date:** 2026-07-23  
**Parent vision:** [`argusforge-contract.md`](argusforge-contract.md) (sealed)  
**Evolution:** [`perpetual-evolution-contract.md`](perpetual-evolution-contract.md)  
**Technical Phase 0:** [`phase-0-architecture.md`](phase-0-architecture.md)  

**Purpose:** Build the **minimal ArgusForge interfaces** to capture, organize, edit, view, and prepare content toward Vault.

**This contract does not:**

- reopen Alexandria;
- define Alexandria Library;
- implement Alexandria/Godot ingestion;
- finalize the complete ArgusForge ontology.

Cursor must complete checklist items **without expanding architecture** and **without copying Alexandria complexity**.

---

## Core pipeline

```text
Active / Archive
  → folders
  → Chaos Decks
  → content ingestion
  → basic management
  → clear Viewer
  → preparation toward Vault
```

---

## 1. ARGUSFORGE HOME

**STATUS:** Minimal home shipped (not final architecture)

- [x] Do not invent final Home architecture.
- [x] Do not block the rest of the interface work.
- [x] Provide navigation access to Active and Archive.
- [x] Keep Focus visible only if clearly marked as pending.
- [x] Do not implement system-trigger logic for Focus yet.

---

## 2. OPERATIONAL VIEWS

### ACTIVE

- [x] Active is available as a principal operational view.
- [x] Active may contain folders.
- [x] Active may contain Chaos Decks.
- [x] Active may contain nested folders.
- [x] Opening Active displays its internal repository-style view.

### ARCHIVE

- [x] Archive is available as a principal operational view.
- [x] Archive preserves content.
- [x] Archive is not deletion.
- [x] Archive may contain folders.
- [x] Archive may contain Chaos Decks.
- [x] Opening Archive displays its internal repository-style view.

### FOCUS

- [x] Focus remains pending.
- [x] Do not treat Focus as a manual folder equivalent to Active or Archive.
- [x] Do not implement Focus triggers yet.
- [x] Record that Focus will later be activated or proposed by system signals.

---

## 3. REPOSITORY / FOLDER VIEW

- [x] Display current level title.
- [x] Display child folders.
- [x] Display Chaos Decks.
- [x] Permit navigation into nested folders.
- [x] Permit navigation back to the parent level.
- [x] Provide search at the current level.
- [x] Provide a simple contextual menu.
- [x] Provide simple statistics for the current level.
- [x] Do not finalize the ontology name for every level unless explicitly approved.
- [x] Do not confuse folders with semantic relations.
- [x] Do not make folder location part of identity.

---

## 4. CREATION MENU

The creation menu may provide:

- [x] New Folder.
- [x] New Chaos Deck.
- [x] New content inside a Chaos Deck.
- [ ] Import content. *(placeholder — not presented as functional)*
- [ ] Add image. *(placeholder — not presented as functional)*
- [ ] Add file or PDF when supported. *(placeholder — not presented as functional)*
- [x] Add link.
- [x] Add text.

### Rules

- [x] Do not require complete classification during capture.
- [x] Do not require semantic relations during capture.
- [x] Do not force the user to explain why material matters.
- [x] Optional context fields must remain optional.
- [x] Do not present unavailable features as functional.

---

## 5. CHAOS DECK LIST VIEW

A folder may display Chaos Decks similarly to a repository or deck list.

- [x] Display Chaos Deck title.
- [x] Display a thumbnail or content preview.
- [x] Display a basic content count.
- [x] Display simple recent activity information.
- [x] Display simple status information where applicable.
- [x] Permit card/grid view.
- [x] Permit list view.
- [x] Permit opening the Chaos Deck.
- [x] Provide a contextual menu for the Chaos Deck.
- [x] Do not add learning grades or Alexandria evaluation logic.

---

## 6. CHAOS DECK INTERNAL VIEW

A Chaos Deck is a cumulative content container.

- [x] Permit the deck to accumulate content over time.
- [x] Do not model the entire Chaos Deck as one fixed note card.
- [x] Display contained items as previews or mini cards.
- [x] Permit list and card/grid presentation.
- [x] Permit opening individual content.
- [x] Provide simple deck statistics.
- [x] Provide a deck-level contextual menu.
- [x] Preserve content order when relevant.
- [x] Permit basic reordering when explicitly implemented.
- [x] Avoid final semantic segmentation at this stage.

---

## 7. CONTENT INGESTION

The Chaos Deck must be prepared to receive:

- [x] Text.
- [x] Links.
- [ ] Images. *(menu placeholder; editor supports image URL markdown)*
- [ ] Files. *(menu placeholder; editor supports file-ref insert)*
- [ ] PDF. *(menu placeholder)*
- [x] Mixed content. *(via markdown body in editor)*

Future-compatible, but not required in this first slice:

- [ ] Audio.
- [ ] Conversations.
- [ ] Repository references.
- [ ] Connector-derived material.
- [ ] Other external sources.

### Rules

- [x] Capture must prioritize avoiding data loss.
- [x] Production capture must not depend only on sessionStorage. *(localStorage prototype; still not server)*
- [x] Clearly distinguish prototype storage from persistent storage.
- [x] Do not silently discard unsupported material.
- [x] Preserve the original source or source reference.
- [x] Do not automatically rewrite raw content.

---

## 8. BASIC EDITOR

The editor should resemble a clear content editor without reproducing Alexandria Library.

- [x] Edit text.
- [x] Add headings.
- [x] Add paragraphs.
- [x] Add lists.
- [x] Add images. *(URL / markdown insert — not binary upload)*
- [x] Add links.
- [x] Add files or references. *(reference insert — binary not stored)*
- [x] Support mixed text and visual content.
- [x] Save changes.
- [x] Close without accidental loss.
- [x] Display basic creation and modification information.
- [x] Do not implement advanced Locus segmentation.
- [x] Do not implement Parcour.
- [x] Do not implement Alexandria evaluation.
- [x] Do not implement spatial or Godot logic.

---

## 9. VIEWER

The Viewer exists for clear reading.

- [ ] Display content without editor controls dominating the screen.
- [ ] Support text and images.
- [ ] Support long content.
- [ ] Preserve readable hierarchy.
- [ ] Permit navigation to previous or next content where applicable.
- [ ] Permit returning to the Chaos Deck.
- [ ] Provide a contextual menu.
- [ ] Keep Viewer simpler than Alexandria Viewer.
- [ ] Do not add evaluation buttons.
- [ ] Do not add spaced repetition.
- [ ] Do not add pedagogical segmentation.
- [ ] Do not pretend to be Alexandria Library.

---

## 10. SIMPLE STATISTICS

Almost every navigational level may show simple statistics.

Possible examples:

- [ ] Number of folders.
- [ ] Number of Chaos Decks.
- [ ] Number of content items.
- [ ] New or recently added content.
- [ ] Last modified date.
- [ ] Archived content count.
- [ ] Pending processing count when later defined.

### Rules

- [ ] Statistics must describe real stored data.
- [ ] Do not introduce grades.
- [ ] Do not introduce due-review schedules.
- [ ] Do not import Alexandria or flashcard statistics.
- [ ] Do not invent MTA Engine behavior.

---

## 11. CONTEXTUAL MENUS

Each level may expose its own small operational universe.

### Folder level

- [ ] Open.
- [ ] Rename.
- [ ] Create child folder.
- [ ] Create Chaos Deck.
- [ ] Move.
- [ ] Archive when applicable.

### Chaos Deck level

- [ ] Open.
- [ ] Rename.
- [ ] Add content.
- [ ] Change view.
- [ ] Move.
- [ ] Archive.
- [ ] Prepare for Vault when that pipeline is opened.

### Content level

- [ ] Open.
- [ ] Edit.
- [ ] Duplicate when explicitly supported.
- [ ] Move.
- [ ] Remove or archive according to the current development policy.
- [ ] Mark for later processing.

### Rule

- [ ] Do not expose actions that are not actually implemented.

---

## 12. VAULT PIPELINE BOUNDARY

Current goal:

```text
Chaos Deck
  → selected content
  → basic treatment
  → Vault preparation
```

- [ ] Provide a future-safe path from Chaos Deck toward Vault.
- [ ] Do not implement final Vault automation unless separately authorized.
- [ ] Do not copy all Chaos content automatically into Vault.
- [ ] Vault receives selected and treated operational context.
- [ ] Preserve source references back to Chaos.
- [ ] Require human review before material becomes authoritative training context.

---

## 13. ALEXANDRIA BOUNDARY

- [ ] Alexandria remains frozen.
- [ ] Do not reproduce Alexandria Library.
- [ ] Do not implement Locus, Parcour, Object, Warp, review schedules or spatial logic here.
- [ ] Do not create Godot integration.
- [ ] Do not define the final Alexandria ingestion contract.
- [ ] Keep original content and references usable for future export.
- [ ] Record future Alexandria enrichment as deferred work.

---

## 14. PROTOTYPE DISCLOSURE

Every prototype must state:

- [ ] What it demonstrates.
- [ ] What it does not demonstrate.
- [ ] What storage is used.
- [ ] Whether data can be lost.
- [ ] Which input types are real.
- [ ] Which buttons are placeholders.
- [ ] Which contract requirements remain incomplete.
- [ ] Whether the component can evolve or should be rebuilt.

### Current known prototypes

#### `/forge` Active / Archive + Chaos Deck + editor (§1–8 partial)

| Field | Statement |
|-------|-----------|
| Demonstrates | Home; Active/Archive folders; Chaos Deck list/grid; deck internal accumulate; text/link ingest; basic markdown editor; reorder; level/deck stats |
| Does not demonstrate | Binary image/file/PDF ingest, dedicated Viewer, Vault prep, Focus triggers, server persistence |
| Storage | `localStorage` key `argusforge-af03-repo-v1` (schema version 2) |
| Data loss | Yes — browser-local only |
| Real actions | Open/navigate, New Folder/Deck, Add text/link, Edit/Save, Rename, Archive, List/Grid, Reorder |
| Placeholders | Import, Add image/file/PDF (menu), Prepare for Vault, Move |
| Incomplete | AF03 §7 binary types; §9 Viewer; §10–13 mostly |
| Evolve or rebuild | May evolve for Viewer/Vault; not contract-complete Chaos |

#### `/forge/chaos` (legacy capture)

| Field | Statement |
|-------|-----------|
| Demonstrates | ArgusForge shell entry; temporary text/link paste; Recent list labeled Raw |
| Does not demonstrate | Active/Archive, folders, Chaos Decks, persistent ingest, editor, Viewer, stats, menus, Vault prep |
| Storage | Browser `sessionStorage` only |
| Data loss | Yes — cleared with session / browser data |
| Real inputs | Text, Link |
| Placeholders | Image, File; Task; Vault |
| Incomplete vs this contract | Prefer `/forge/deck/[id]` for Chaos Deck work |
| Evolve or rebuild | Treat as **rebuild candidate** into Chaos Deck ingest; must not redefine the Chaos contract |

---

## 15. IMPLEMENTATION DISCIPLINE

Before modifying code, Cursor must provide:

- [ ] Files proposed for modification.
- [ ] Responsibility of each file.
- [ ] Exact interface slice being implemented.
- [ ] Contract checklist items covered.
- [ ] Checklist items explicitly excluded.
- [ ] Risks.
- [ ] Persistence implications.
- [ ] Verification plan.

### Rules

- [ ] One logical interface slice at a time.
- [ ] No simultaneous implementation of Home, folders, editor, Viewer and Vault.
- [ ] No invention of missing ontology.
- [ ] No Alexandria code.
- [ ] No MTA Engine logic.
- [ ] No Argus Engine schema.
- [ ] Stop when repository reality differs from the assumed structure.

---

## 16. DELIVERY ORDER

Recommended interface sequence:

- [x] 1. Active / Archive repository view.
- [x] 2. Folder navigation.
- [x] 3. Chaos Deck list/grid.
- [x] 4. Chaos Deck internal content view.
- [x] 5. Basic content creation and ingestion. *(text/link; binary types deferred)*
- [x] 6. Basic editor.
- [ ] 7. Clear Viewer.
- [x] 8. Simple statistics. *(level + deck stats; richer later)*
- [x] 9. Contextual menus. *(folder/deck/content; Move/Vault still placeholders)*
- [ ] 10. Vault preparation boundary.
- [ ] 11. Focus design — later.
- [ ] 12. Alexandria integration — separate future phase.

---

## Definition of complete for this contract

This interface phase is complete when the user can:

- [x] Enter Active or Archive.
- [x] Navigate folders.
- [x] Create or open a Chaos Deck.
- [x] Ingest persistent content. *(browser-local text/link; not server)*
- [x] View its items as cards or a list.
- [x] Edit supported content.
- [ ] Open a clean Viewer.
- [x] See simple truthful statistics.
- [x] Use contextual menus appropriate to each level.
- [ ] Preserve a future path toward Vault.
- [x] Do all this without reopening Alexandria.

---

## Related

| Document | Role |
|----------|------|
| [argusforge-contract.md](argusforge-contract.md) | Sealed vision |
| [perpetual-evolution-contract.md](perpetual-evolution-contract.md) | Evolution addendum |
| [phase-0-architecture.md](phase-0-architecture.md) | Phase 0 technical map |
| [vault-training-layer-contract.md](vault-training-layer-contract.md) | Vault ≠ Memory |
| [alexandria-frozen-contract.md](alexandria-frozen-contract.md) | Alexandria FROZEN |
| [README.md](README.md) | Index |
