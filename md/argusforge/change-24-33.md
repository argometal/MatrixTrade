# CHANGE 24-33 — Recent linkage on Argus Treemap

**Status:** Implemented  
**Route:** `/forge/argus`  
**Code:** `lib/argusforge/af03-recent-linkage.ts` · `RecentLinkageSection.tsx`

## Goal

Show the five most recent Fragments under the Realm Treemap with a derived linkage status. No new store, events, or ontology.

## Status

| Status | When |
|--------|------|
| **Unlinked** | Chaos Inbox / unassigned deck, or no Realm and no relations |
| **In Realm** | Deck has a Realm folder; no Argus relations |
| **Related** | ≥1 existing Argus relation references the Fragment or its Deck units |

Related wins over Inbox when relations exist.

## Data

`state.items` sorted by `createdAt` desc · Deck · Folder/Realm title · `graph.units` + `graph.relations` for counts. Image thumb from first image block asset when present.

## Out of scope

Link/Move/Edit/AI · suggestions · metrics · filters · new persistence.
