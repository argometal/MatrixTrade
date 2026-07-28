# CHANGE 24-33 — Recent linkage on Argus Treemap

**Status:** Implemented (semantics refined in **24-36**; PR #110 pending merge)  
**Route:** `/forge/argus`  
**Code:** `lib/argusforge/af03-recent-linkage.ts` · `RecentLinkageSection.tsx`

## Goal

Show the five most recent Fragments under the Realm Treemap with a derived linkage status. No new store, events, or ontology.

## Four-state derivation (24-36)

Projection from existing `graph.units` + `graph.relations` only. **No auto-linking. No new persistence.** Deck relation does **not** imply a direct Fragment relation.

| Status | Label | When |
|--------|-------|------|
| `related` | Related · N relations | ≥1 relation touches a unit with `chaosItemId === fragmentId` |
| `in_related_deck` | In related Deck | No Fragment relation; ≥1 relation touches a unit with `chaosDeckId === deckId` |
| `in_realm` | In Realm | No Fragment or Deck relations; parent Deck has a Realm folder |
| `unlinked` | Unlinked | No Fragment or Deck relations; Deck unassigned / Chaos Inbox / no Realm |

Counts use **unique relation IDs** (`fragmentRelationCount`, `deckRelationCount`).

Chaos Inbox identity via `findChaosInboxId` (not title alone). Status follows actual linkage: Inbox + direct Fragment relation → Related; Inbox + Deck-only → In related Deck.

## Data

`state.items` sorted by `createdAt` desc · Deck · Folder/Realm title · optional image asset from first image block.

## Out of scope

Link/Move/Edit/AI · suggestions · metrics · filters · new persistence · treating Deck relation as Fragment Related.
