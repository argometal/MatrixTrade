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
Repository (one interface)
  → filter: Active | Archive   (Focus later — out of scope now)
  → folders (reorganize)
  → Chaos Decks
  → content ingestion
  → basic management
  → clear Viewer
  → preparation toward Vault
```

**Correction (CHANGE 24-01, shell):** Primary bar is `[home icon] | Argus | + | [handoff icon]`. Focus / Active / Archive live under Argus secondary only. Create is global `+`. Handoff icon keeps provisional Vault route without “Vault” as bar label.

**Correction (agreed, not yet shipped for repo UI):** Active and Archive are **lifecycle filters on one repository UI**, not two places to create content. See **DEBT-AF03-01** below.

---

## DEBT-AF03-01 — Active / Archive are filters, not twin creation surfaces

**Status:** OPEN — documented debt; do not pretend the current dual routes are the sealed model  
**Agreed direction (user + Phase 0):**

| Layer | Meaning |
|-------|---------|
| Operational state | **Active / Archive** (and later **Focus**) = filters / lifecycle views |
| Manual location | Folders = where I browse — **reorganization is allowed** |
| Identity | Path and filter do not create a new KEY |

**Current prototype mistake:** `/forge/active` and `/forge/archive` behave like **two repository roots** with create actions in both. That incorrectly implies two birth places for folders/decks.

**Target (when this debt is paid):**

1. **One repository interface** (single tree / list chrome).
2. **Active | Archive** = filter chips (or equivalent), not separate nav destinations that fork creation.
3. **Create** (folder / deck / content) is **not** “create in Active” vs “create in Archive”. New work **births as Active**. Archive is preserve-state, not a birth place — hide or disable create while Archive filter is on (or always birth Active if create remains visible).
4. **Reorganize** (rename, move folder hierarchy when implemented, open/navigate) remains valid on the shared interface; archiving/restoring is a **state action**, not “move to another app”.
5. **Focus** stays out of this debt slice — still pending; later another filter, not a third root.
6. Routes like `/forge/active` and `/forge/archive` may redirect to one hub + filter; deck routes stay id-based (`/forge/deck/[id]`).

**Allowed until solved:** keep shipping other AF03 slices; **reorganization** of folders/decks in the existing UI is fine; do **not** expand Archive into a second full creation product surface.

**Not allowed while debt is open:** claiming Active/Archive dual trees are final ontology; inventing Focus as a manual folder twin.

**Checklist when closing this debt:**

- [ ] Single repo UI with Active | Archive filter
- [ ] Create births Active only; Archive filter does not offer twin create-world
- [ ] Archive / Restore = state change, not second tree
- [ ] Home / shell nav no longer present Active and Archive as two creation homes
- [ ] AF03 §2 wording and prototype disclosure updated to “paid”
- [ ] Focus still excluded unless separately approved

---

## 1. ARGUSFORGE HOME

**STATUS:** Overview dashboard shipped (not final architecture)

- [x] Do not invent final Home architecture.
- [x] Do not block the rest of the interface work.
- [x] Provide navigation access to Active and Archive. *(via Library + filter chips on Home; interim dual routes — DEBT-AF03-01)*
- [x] Keep Focus visible only if clearly marked as pending.
- [x] Do not implement system-trigger logic for Focus yet.
- [x] Home is an **overview dashboard**, not a duplicate Active/Focus list.

---

## 2. OPERATIONAL VIEWS

> **DEBT-AF03-01:** Treat checklist items below as **interim dual-route prototype**, not as approval of two creation surfaces. Target = one interface + filters.

### ACTIVE

- [x] Active is available as a principal operational view. *(interim: separate route; target: filter)*
- [x] Active may contain folders.
- [x] Active may contain Chaos Decks.
- [x] Active may contain nested folders.
- [x] Opening Active displays its internal repository-style view.

### ARCHIVE

- [x] Archive is available as a principal operational view. *(interim: separate route; target: filter)*
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
- [x] Images. *(URL ingest; binary upload not stored)*
- [x] Files. *(name/reference stub — binary not stored, not silently discarded)*
- [x] PDF. *(name/reference stub — binary not stored, not silently discarded)*
- [x] Mixed content. *(via markdown body in editor / viewer)*

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

- [x] Display content without editor controls dominating the screen.
- [x] Support text and images.
- [x] Support long content.
- [x] Preserve readable hierarchy.
- [x] Permit navigation to previous or next content where applicable.
- [x] Permit returning to the Chaos Deck.
- [x] Provide a contextual menu.
- [x] Keep Viewer simpler than Alexandria Viewer.
- [x] Do not add evaluation buttons.
- [x] Do not add spaced repetition.
- [x] Do not add pedagogical segmentation.
- [x] Do not pretend to be Alexandria Library.

---

## 10. SIMPLE STATISTICS

Almost every navigational level may show simple statistics.

Possible examples:

- [x] Number of folders.
- [x] Number of Chaos Decks.
- [x] Number of content items.
- [x] New or recently added content.
- [x] Last modified date.
- [x] Archived content count.
- [x] Pending processing count when later defined. *(marked-for-later count on deck)*

### Rules

- [x] Statistics must describe real stored data.
- [x] Do not introduce grades.
- [x] Do not introduce due-review schedules.
- [x] Do not import Alexandria or flashcard statistics.
- [x] Do not invent MTA Engine behavior.

---

## 11. CONTEXTUAL MENUS

Each level may expose its own small operational universe.

### Folder level

- [x] Open.
- [x] Rename.
- [x] Create child folder.
- [x] Create Chaos Deck.
- [ ] Move. *(disabled placeholder — not presented as functional)*
- [x] Archive when applicable.

### Chaos Deck level

- [x] Open.
- [x] Rename.
- [x] Add content.
- [x] Change view.
- [ ] Move. *(disabled placeholder)*
- [x] Archive.
- [x] Prepare for Vault when that pipeline is opened.

### Content level

- [x] Open.
- [x] Edit.
- [x] Duplicate when explicitly supported.
- [ ] Move. *(disabled placeholder)*
- [x] Remove or archive according to the current development policy.
- [x] Mark for later processing.

### Rule

- [x] Do not expose actions that are not actually implemented.

---

## 12. VAULT PIPELINE BOUNDARY

Current goal:

```text
Chaos Deck
  → selected content
  → basic treatment
  → Vault preparation
```

- [x] Provide a future-safe path from Chaos Deck toward Vault.
- [x] Do not implement final Vault automation unless separately authorized.
- [x] Do not copy all Chaos content automatically into Vault.
- [x] Vault receives selected and treated operational context. *(review queue only)*
- [x] Preserve source references back to Chaos.
- [x] Require human review before material becomes authoritative training context.

---

## 13. ALEXANDRIA BOUNDARY

- [x] Alexandria remains frozen.
- [x] Do not reproduce Alexandria Library.
- [x] Do not implement Locus, Parcour, Object, Warp, review schedules or spatial logic here.
- [x] Do not create Godot integration.
- [x] Do not define the final Alexandria ingestion contract.
- [x] Keep original content and references usable for future export.
- [x] Record future Alexandria enrichment as deferred work.

---

## 14. PROTOTYPE DISCLOSURE

Every prototype must state:

- [x] What it demonstrates.
- [x] What it does not demonstrate.
- [x] What storage is used.
- [x] Whether data can be lost.
- [x] Which input types are real.
- [x] Which buttons are placeholders.
- [x] Which contract requirements remain incomplete.
- [x] Whether the component can evolve or should be rebuilt.

### Current known prototypes

#### `/forge` repository + deck + editor + viewer + vault prep (§1–12)

| Field | Statement |
|-------|-----------|
| Demonstrates | Home; Active/Archive (interim dual routes); folders; Chaos Decks; text/link/image-URL ingest; file/PDF stubs; editor; Viewer; selection → Vault review queue; stats; menus |
| Does not demonstrate | Server persistence; binary file storage; final Vault automation; Focus triggers; unified Active/Archive filter UI (**DEBT-AF03-01**); Alexandria |
| Storage | `localStorage` `argusforge-af03-repo-v1` + `argusforge-af03-vault-prep-v1` |
| Data loss | Yes — browser-local only |
| Real actions | Navigate, create folder/deck, ingest text/link/image URL, file/PDF stubs, edit, view, reorder, duplicate, mark later, archive/restore, prepare Vault (review queue) |
| Placeholders | Import bulk; Move; Focus |
| Incomplete | DEBT-AF03-01; Focus design; server Vault; binary payloads |
| Evolve or rebuild | Evolve Viewer/Vault boundary; collapse dual Active/Archive per debt |

#### `/forge/chaos` (legacy capture)

| Field | Statement |
|-------|-----------|
| Demonstrates | Legacy sessionStorage capture shell |
| Does not demonstrate | Prefer `/forge/deck/[id]` for Chaos Deck work |
| Storage | Browser `sessionStorage` only |
| Data loss | Yes |
| Real inputs | Text, Link |
| Placeholders | Image, File; Task |
| Incomplete vs this contract | Rebuild candidate |
| Evolve or rebuild | Rebuild into Chaos Deck ingest |

---

## 15. IMPLEMENTATION DISCIPLINE

Before modifying code, Cursor must provide:

- [x] Files proposed for modification. *(this §7+ slice — see PR)*
- [x] Responsibility of each file.
- [x] Exact interface slice being implemented. *(Viewer, ingest stubs, stats/menus polish, Vault prep boundary, Alexandria boundary docs)*
- [x] Contract checklist items covered.
- [x] Checklist items explicitly excluded. *(Focus; DEBT-AF03-01 unification; server persistence; Move)*
- [x] Risks. *(localStorage loss; dual-route interim)*
- [x] Persistence implications. *(browser-local only)*
- [x] Verification plan. *(tsc + route smoke)*

### Rules

- [x] One logical interface slice at a time. *(remaining AF03 checklist batch after §1–6)*
- [x] No simultaneous invention of final Home + ontology.
- [x] No invention of missing ontology.
- [x] No Alexandria code.
- [x] No MTA Engine logic.
- [x] No Argus Engine schema.
- [x] Stop when repository reality differs from the assumed structure.

---

## 16. DELIVERY ORDER

Recommended interface sequence:

- [x] 1. Active / Archive repository view.
- [x] 2. Folder navigation.
- [x] 3. Chaos Deck list/grid.
- [x] 4. Chaos Deck internal content view.
- [x] 5. Basic content creation and ingestion.
- [x] 6. Basic editor.
- [x] 7. Clear Viewer.
- [x] 8. Simple statistics.
- [x] 9. Contextual menus. *(Move still placeholder)*
- [x] 10. Vault preparation boundary.
- [ ] 11. Focus design — later.
- [ ] 12. Alexandria integration — separate future phase. *(boundary respected; integration deferred)*

---

## Definition of complete for this contract

This interface phase is complete when the user can:

- [x] Enter Active or Archive.
- [x] Navigate folders.
- [x] Create or open a Chaos Deck.
- [x] Ingest persistent content. *(browser-local; stubs for binary)*
- [x] View its items as cards or a list.
- [x] Edit supported content.
- [x] Open a clean Viewer.
- [x] See simple truthful statistics.
- [x] Use contextual menus appropriate to each level.
- [x] Preserve a future path toward Vault.
- [x] Do all this without reopening Alexandria.

**Remaining after this contract UI:** DEBT-AF03-01 (filter unification), Focus, server persistence, Alexandria enrichment phase.

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

