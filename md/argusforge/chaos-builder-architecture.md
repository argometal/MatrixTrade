# Chaos builder architecture — evolve to Argus, culminate in Alexandria

**Status:** Architecture proposal — **non-binding until approved**; **implementation scope = builder only**  
**Date:** 2026-07-25  
**Discussion base:** [`chaos-locus-capture-design.md`](chaos-locus-capture-design.md)  
**Deferred:** full Alexandria handoff pipeline ([`chaos-to-library-alexandria-pipeline.md`](chaos-to-library-alexandria-pipeline.md)) — leave as research; do not build now

---

## 1. Long arc (destination, not this sprint)

```text
NOW                         NEXT                        LATER
─────────────────────────   ─────────────────────────   ─────────────────────────
Chaos                       Argus                       Alexandria (motor)
  progressive locus           Parcour / Castle /          I. Motor under Argus
  builder (text+images)       Realm structure             (+ Godot if earned)
  Decks + Fragments           export/archive Realm        spatial culmination
  IndexedDB assets            Fragment → structure
                              (no body re-author)
```

| Stage | Owns | Does not own |
|-------|------|----------------|
| **Chaos (now)** | Capture + locus **builder** | Castles, Realm export package, Godot, SRS |
| **Argus (after)** | Structure: Parcour → Castle content; Realm as exportable/archivable package | Dump inbox; primary body editor |
| **Alexandria (later)** | Spatial / motor culmination of formed Realms | Chaos UX |

**Rule:** shape Chaos data so Argus/Alexandria can attach later **without rewriting bodies**.  
**Rule:** Alexandria **pipeline / interchange product** stays deferred — too much software evolution; keep research notes only.

---

## 2. Scope for implementation (approved direction)

### In scope now — complete through builder

1. Fragment **block body** model (ORM-shaped `p` / `img` / `link` minimum).  
2. **Progressive builder UI** (light → full by use/importance).  
3. Image **ingest triad**: pick · drop · paste.  
4. **IndexedDB** blob store for binaries; repo keeps refs.  
5. Reorder blocks; thumbnails; durable edit/save in Chaos Deck.  
6. Keep existing Vault prep **compatible** (select Fragments → Vault) without new Alexandria export UI.  
7. **Evolution hooks** only: stable Fragment ids, asset keys, optional `builderTier` / usage counters — no Castle UI, no handoff zip.

### Explicitly out of scope now

| Deferred | Why |
|----------|-----|
| Alexandria handoff package / zip / import into LibraryBuild | Heavy; leave research as-is |
| Live Alexandria / Godot / GateKeeper coupling | Repo freeze + motor later |
| Parcour / Castle authoring UI in Argus | After builder |
| Realm export/archive package format | Argus stage |
| Match / Fib / SRS / card engine | Not Chaos |
| Server persistence | Separate track |

---

## 3. Target shapes (Chaos now)

### 3.1 Layers Chaos already has

```text
AF folder (UI: Realm — org only, different namespace)
  └── Chaos Deck
        └── Fragment (content item)
              └── body blocks + asset refs   ← builder surface
```

Do **not** introduce Parcour/Castle types in Chaos storage yet.  
Decks remain the capture bags; Argus will later map Fragments into Parcour/Castle under a structural Realm.

### 3.2 Fragment body (evolution-safe)

Extend `Af03ContentItem` (or successor) conceptually:

```text
Fragment {
  id, deckId, title, order, timestamps, markedForLater, …
  kind: "mixed" | legacy kinds          // new captures prefer mixed
  body: string                          // legacy plain/markdown kept for migration
  blocks: Block[] | null                // canonical when builder used
  assetIds: string[]                    // IndexedDB keys
  usage: { openCount, editCount, lastUsedAt }   // drives growth
  builderTier: "dump" | "basic" | "full"        // derived or stored
}
```

**Block (aligned to ORM-16-07 authoring core, not full Library):**

```text
{ type: "p", text, textKind?: "text" }
{ type: "img", assetId?, srcUrl?, role?: "content" }
{ type: "link", href | key?, text? }
```

Legacy items without `blocks`: read path synthesizes one block from `kind`+`body` (no wipe).

### 3.3 Asset store

```text
IndexedDB  "argusforge-chaos-assets-v1"
  key: assetId
  value: { mime, bytes|blob, createdAt, fragmentId? }

Repo (localStorage) stores only assetId + optional filename/mime hint.
```

### 3.4 Progressive builder

| Tier | When | UI |
|------|------|-----|
| **dump** | new / low use | Fast capture: textarea or paste/drop → auto blocks |
| **basic** | some use / user expands | Block list, add p/img/link, reorder |
| **full** | high recurrence / importance | Full locus-builder chrome (Library editor spirit): rail, roles thin, keyboard paste, multi-image hygiene |

Tier may unlock automatically from `usage` **or** via explicit “Expand builder” — user agency wins if they force full early.

---

## 4. Runtime architecture (AF web)

```text
UI
  DeckInternalView          — list Fragments; dump capture strip
  FragmentBuilder (new)     — progressive block editor
  existing Viewer/Editor    — migrate toward Builder; keep Viewer read-only

lib/argusforge/
  af03-repo-types / store   — Fragment + blocks fields; migrate v2→v3 if needed
  af03-chaos-assets-idb     — get/put/delete blobs (new)
  af03-fragment-blocks      — normalize legacy→blocks; serialize preview
  af03-builder-tier         — derive tier from usage (new, pure)

Vault prep                  — keep selecting Fragment ids; optional preview from blocks
Alexandria handoff          — NOT wired in UI (research only)
```

**Routes:** stay on `/forge/deck/[deckId]` + `/forge/deck/.../item/[itemId]` — builder replaces/enhances item editor; no new top-level product.

---

## 5. Evolution contracts (build now, use later)

These are **hooks**, not features:

| Hook | Now | Later consumer |
|------|-----|----------------|
| Stable `fragment.id` | already | Argus unit / Castle membership |
| `blocks[]` ORM-shaped | builder | Alexandria motor / handoff when reopened |
| `assetId` + IDB | builder | export/archive Realm package |
| `usage` / `builderTier` | builder growth | Argus “earned integration” signals |
| Deck + AF-folder Realm | org | Map into structural Realm carefully (namespaces) |

**Do not** invent Parcour/Castle tables in Chaos.  
**Do not** ship `af.chaos.library_handoff` export button until a dedicated reopen slice.

---

## 6. Build order (implementation when coding starts)

| Step | Deliverable | Done when |
|------|-------------|-----------|
| **B0** | Types + migration: `blocks`, `assetIds`, `usage`; legacy synthesize | Old decks open; no data loss |
| **B1** | IndexedDB asset module + tests/smoke | Image blob round-trip survives reload |
| **B2** | Dump capture: paste/drop/pick → Fragment blocks on deck | Fast dump without full chrome |
| **B3** | Basic builder UI on Fragment | Edit p/img/link, reorder, save |
| **B4** | Full tier unlock by usage + manual expand | High-use Fragment shows full chrome |
| **B5** | Viewer reads blocks (img thumbnails) | Read path matches builder |
| **B6** | Vault prep still works on Fragment selection | No regression |

**Stop before:** Alexandria export zip, Castle UI, Realm archive format, Godot.

---

## 7. After builder (roadmap only)

```text
Argus structure slice
  · Parcour (WIP content path) groups Fragment refs
  · Castle = culminated content inside Realm
  · Realm = exportable / archivable structure
  · link out to Chaos builder for body edits

Alexandria culmination (reopen)
  · evolve software + interchange (research notes already exist)
  · motor under Argus; Godot if still right
  · pipeline work resumes only under explicit authorization
```

---

## 8. Risks / constraints

| Risk | Mitigation |
|------|------------|
| localStorage repo vs IDB blobs desync | Delete asset with Fragment; orphan GC on deck open |
| AF “Realm” folder vs structural Realm | Keep namespaced docs; no merge in B0–B6 |
| Scope creep into Library-the-product | Builder = locus capture only; no SRS/Parcour in Chaos |
| Alexandria pipeline temptation | Explicit stop line in §2 / §6 |

---

## 9. Decision summary

1. **Now:** finish Chaos **through progressive locus builder** (text + images, IDB binaries).  
2. **Shape for evolution:** blocks + asset ids + usage so Argus/Alexandria can attach later.  
3. **Alexandria pipeline:** leave research as-is; **no implementation**.  
4. **Argus Parcour/Castle/Realm structure:** after builder.  
5. **Chaos before Castle:** unchanged; Fragment need not ever join a Castle.

---

## Related

| Doc | Role |
|-----|------|
| [`chaos-locus-capture-design.md`](chaos-locus-capture-design.md) | Product split + ontology |
| [`chaos-to-library-alexandria-pipeline.md`](chaos-to-library-alexandria-pipeline.md) | Deferred pipeline research |
| [`alexandria-frozen-contract.md`](alexandria-frozen-contract.md) | Repo freeze + Argus = Alexandria +1 |
| [`af03-chaos-interface-contract.md`](af03-chaos-interface-contract.md) | Current checklist (amend when coding) |
| Alexandria ORM-16-07 / LAYERS | Block + Realm/Parcour/Castle meanings |
