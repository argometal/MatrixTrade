# CHANGE 24-50 — Chaos semantic alignment + Global Find → Viewer

**Status:** Implementation  
**Date:** 2026-08-31  
**Surfaces:** Home Explorer search · `af03-home-explorer.ts` · haystack from `af03-deck-search.ts`

---

## Sealed truths

| Term | Meaning |
|------|---------|
| **Chaos** | Capture when we do **not** yet know what the material is, where it ends, or how it should be organized |
| **Fragment** | Raw capture / idea — may be incomplete, disordered, temporary, or useless |
| **Deck** | Container of multiple Fragments — **no** implied topic, intellectual order, study unit, or Parcour |
| **Block** | Optional internal structure when a Fragment evolves — does **not** obligate Alexandria |
| **Realm** | Practical location — not intellectual meaning |

**Do not assume:** `Deck = Parcour` · `Fragment = Locus`.

Future bridge may map one Deck → zero/one/many Parcours; Fragments from different Decks may relate spatially later.

> Chaos allows containing without understanding. Alexandria structures when structure adds value.

---

## Shipped behavior

**Global Find** (Home `/forge` search):

1. Searches Fragments globally with the **same haystack** as Deck search (title, body, blocks, captions/filenames, tags).
2. Fragment hit → **`/view` (Viewer)**, not Editor.
3. Deck title shown as **provenance / convenience container**, not semantic meaning.
4. Finding does **not** require prior correct organization.

Out of scope: Alexandria, Argus, recall/SRS, Vault cleanup, Realm redesign, Deck rename, new ontology.

---

## Validation

See `tools/test-chaos-global-find-24-50.ts` and `npm run test:chaos-deck-24-39` (Deck search regression).
