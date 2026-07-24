# How ArgusForge works

**UI entry:** `/forge`  
**Vision map:** [`vision-and-direction.md`](vision-and-direction.md)  
**Sealed identity:** [`argusforge-contract.md`](argusforge-contract.md)

---

## Core loop

```text
Capture → Open Realm → Relate decks → Prepare Vault → (later) time + space
```

| Verb | Meaning |
|------|---------|
| **Capture** | Dump into a Chaos Deck as Fragments — no forced classification |
| **Browse ops** | Home overview; Active/Archive lists for folder administration |
| **Explore Argus** | Realm Treemap → molecular graph of Chaos Decks |
| **Relate** | Explicit links between units/decks; affinity is only a hint |
| **Prepare** | Select fragments → Vault review queue (human gate) |

---

## When to open what

| Need | Open |
|------|------|
| See counts, recent decks, vault attention | **Home** `/forge` |
| Manage folders / rename / archive as a list | **Active** or **Archive** lists |
| See thematic mass and activity as blocks | **Argus** Treemap `/forge/argus` |
| Move among Chaos Decks in a theme | **Realm** `/forge/realm/[id]` |
| Read / edit Fragments | **Chaos Deck** `/forge/deck/[id]` |
| Hand off formation package | **Vault** `/forge/vault` |
| Fragment-level engine graph | `/forge/argus/units` |

---

## Shell

```text
[ Home icon ]  |  Argus  |  +  |  [ Prepared output ]
```

- **Home icon** → traditional dashboard.  
- **Argus** → experimental Treemap; secondary **Focus | Active | Archive** filters that Treemap.  
- **+** → New Chaos Deck / New Realm (global create).  
- **Prepared output** → Vault (no “Vault” word required on the bar).

From Home browse chips, **Active list** / **Archive** still open the traditional `RepositoryView`.

---

## Chaos Deck & Fragments

- A **Chaos Deck** is a binder of raw material.  
- A **Fragment** is one content unit (text, link, image URL, stubs…).  
- Capture prefers wide ingest over classification.  
- Classification and Engine typing can wait.

---

## Argus molecular cues (provisional)

| Cue | Means |
|-----|--------|
| Node size | Importance / mass (not raw fragment flood) |
| Color | Recent use |
| Pulse | Current activity (respect reduced motion) |
| Solid link | Confirmed relation |
| Dashed link | Suggested relation |
| Halo / orbit | Affinity placeholder — **not** a formal relation |

---

## Systems switch

Header **ArgusForge | MTA** selects coordination context. MTA product deep-links stay scoped; AF Chaos objects are not mixed into MTA lists.

---

## Storage (prototype)

Browser `localStorage` for AF03 repo, vault prep, system selection, Argus graph, molecular overlay.  
**Disclose:** refresh keeps data; clearing site data loses it. Not server persistence.

---

## Related

- Ontology names: [`ontology-working.md`](ontology-working.md)  
- Runtime table: [`runtime-truth.md`](runtime-truth.md)  
