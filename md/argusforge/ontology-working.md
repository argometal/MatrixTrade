# ArgusForge — Working ontology (UI names)

**Status:** Canonical for **UI / working language** — not a sealed expansion of Phase 0 schema  
**Date:** 2026-07-24  
**Does not replace:** sealed contracts or Engine schemas  
**Related:** [`vision-and-direction.md`](vision-and-direction.md) · [`phase-0-architecture.md`](phase-0-architecture.md)

---

## Hierarchy

```text
Realm
  → Chaos Deck
      → Fragment

Molecule (provisional group of Chaos Decks)
```

| Name | Role | Backing today |
|------|------|----------------|
| **Realm** | Upper thematic container | Folder (`Af03Folder`) — preserve ids |
| **Chaos Deck** | Binder / graph body inside a Realm | Deck (`Af03ChaosDeck`) |
| **Fragment** | Raw content unit inside a deck | Content item (`Af03ContentItem`) |
| **Molecule** | Group with confirmed or detected affinity | Overlay / structural placeholder — not a formal Argus edge |

---

## Rules

1. **Do not flatten** Realm → Deck → Fragment into one list of “notes.”  
2. **Unassigned** is a provisional Realm for root decks (`folderId = null`).  
3. **Molecule ≠ relation.** Affinity/orbit means “may belong together”; explicit link means known relation.  
4. Internal type names (`folder`, `item`) may remain in code until a safe rename.  
5. Prefer UI labels: Realm, Chaos Deck, Fragment — not “Folder / Content Item” on Argus/Home primary copy.

---

## Rejected / superseded names

| Avoid (product label) | Why |
|----------------------|-----|
| Θήκη / Theke | Rejected — binder stays **Chaos Deck** |
| Dump (as unit name) | Rejected — unit is **Fragment** |
| Library as main AF identity | Lists remain; Argus is not “the Library product” |

---

## Future mapping (Alexandria — FROZEN, non-binding)

```text
Realm      → spatial domain
Molecule   → possible Parcour / knowledge group
Chaos Deck → station / major body
Fragment   → loci / learning material
```

Do not implement until Alexandria is reopened under its own phase.

---

## Engine vs Chaos

- **Chaos** owns source Fragments.  
- **Argus Engine** may project units/relations over Chaos — display layer, not a second body store.  
- **MTA** may later score affinity/decay — Argus shows and lets humans confirm/reject.
