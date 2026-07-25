# Chaos → Library → Argus (Alexandria +1) — compatibility pipeline (research)

**Status:** Research — **non-binding**, deferred until Alexandria reopen  
**Date:** 2026-07-25  
**Does not:** implement Alexandria motor in MatrixTrade · reopen GateKeeper · merge the frozen repo  
**Binding freeze:** [`alexandria-frozen-contract.md`](alexandria-frozen-contract.md) (§0: repo freeze ≠ architecture death)  
**Alexandria repo (frozen):** https://github.com/argometal/Alexandria (LibraryBuild + GateKeeper + ORM-16)  
**AF working names:** [`ontology-working.md`](ontology-working.md) when present; else sealed AF contracts

---

## Destination framing (product intent)

```text
Alexandria repo (frozen)  →  proven path / mechanics baseline
Argus                     →  Alexandria + 1
Alexandria (evolved)      →  I. Motor inside Argus
```

- The **repo** Alexandria is frozen because that line already found a working path.  
- The **architecture** is not sealed forever inside that repo: what integrates next evolves into a **new Alexandria**.  
- **Argus** is that next generation; historical Alexandria becomes the **motor / engine** under Argus — not a forever-separate product beside it.  
- Until reopen: AF builds Chaos / Vault / Argus surfaces **without** depending on the frozen repo.

---

## Goal (near-term product intent)

**Library is hybrid inside ArgusForge** (see design discussion):

- **Chaos** = only Library’s **locus capture / body builder** (text + images at full construction capacity for pipeline).  
- **Argus** = Parcour-like / **castillos** / structure + host of Alexandria +1 motor.  
- **Godot** = candidate spatial Alexandria — not Chaos.

```text
Chaos (locus builder)     →  Fragments with ORM-shaped bodies (dump OK, builder complete)
Argus (Library hybrid)    →  castillos / parcour-like assembly + relations
Vault                     →  human gate / formation prep
Alexandria motor (Argus)  →  spatial runtime consuming formed knowledge
```

Design discussion (preferred reading before coding):  
[`chaos-locus-capture-design.md`](chaos-locus-capture-design.md)

It does **not** mean: put all of LibraryBuild into Chaos; edit 3D corridors from Chaos; or merge the frozen Alexandria repo into MatrixTrade while freeze holds.

---

## Two ontologies (do not flatten)

| ArgusForge (Chaos / AF) | Alexandria line (Library / motor) |
|-------------------------|-----------------------------------|
| AF Realm (folder theme) | Alexandria Realm (`R1` …) — spatial world root |
| Chaos Deck | *No 1:1* — often maps to **Parcour** or to a **bundle of loci** |
| Fragment | Material for **Object / locus** `body_text` blocks |
| Molecule (affinity) | Hint for which Fragments share a Parcour — not a GK edge |
| Argus (AF lab / +1 host) | Host of evolved Alexandria as **I. Motor** after reopen |

Names collide on “Realm” and “Argus”. Until reopen, treat AF Realm vs Alexandria Realm as **different namespaces**. A future bridge must use explicit prefixing (`af_realm_*` vs `R1`).

---

## Compatibility target (LibraryBuild contract)

LibraryBuild already expects locus content as JSON blocks in `entries.body_text` (ORM-16-07):

| Block `type` | Chaos Fragment source (provisional map) |
|--------------|----------------------------------------|
| `p` | Text / markdown body → paragraph(s); `textKind` later (`hint`, `place`, …) |
| `img` | Image URL / future binary → `src` + `role` |
| `link` | Link fragment → external URL as `p`+URL or deferred KEY link |
| `card` | Structured stub (term + image) → Match-cards-adjacent or locus card |
| `tag` | AF tags / Argus tags when present |
| `audio` / `warp` | Later — not Chaos v1 |

**Minimum interchange shape (proposed, not shipped):**

```json
{
  "schema": "af.chaos.library_handoff.v0",
  "source": { "system": "argusforge", "chaosDeckId": "…", "exportedAt": "ISO" },
  "placement": {
    "suggestedAlexandriaRealmId": null,
    "suggestedParcourKey": null,
    "afRealmId": "…",
    "afMoleculeId": null
  },
  "lociCandidates": [
    {
      "sourceFragmentId": "…",
      "title": "…",
      "body": [{ "type": "p", "text": "…", "textKind": "text" }],
      "assets": []
    }
  ]
}
```

Library gains an **import** of this package → creates/fills `entries` under a chosen Parcour. GateKeeper stays traversal-only. Later reopen: formed loci feed the **Alexandria motor under Argus**.

---

## Evolution stages (Chaos side first)

### Stage 0 — Freeze-safe prep (now, AF only)

1. Keep Chaos capture UX (Fragments stay easy).  
2. Document mapping (this note) + destination framing (Alexandria +1 / motor).  
3. Optional Fragment fields (safe defaults, no wipe):  
   - `libraryBlockHint`: `p` \| `img` \| `link` \| `card` \| `unknown`  
   - `exportReady`: boolean  
   - `alexandriaLocusKey`: null until import  
4. **Do not** call Alexandria APIs from AF. **Do not** ship the motor in MatrixTrade.

### Stage 1 — Export handoff (AF → file)

1. From Chaos Deck or Vault: **Export Library handoff** → JSON (+ assets folder).  
2. Normalize Fragment → ORM-16-07 blocks (lossy OK if disclosed).  
3. Human picks target Parcour **in Library** (or deferred placement hints from AF Realm/Molecule).

### Stage 2 — Library becomes the editor of record for formed bodies

1. After import, **authoritative body** lives in Library locus.  
2. Chaos Fragment can remain as **source scrap** (append-only) or mark `supersededByLocusKey`.  
3. Match cards / Fib review stay in Library — Chaos does not grow SRS.

### Stage 3 — Reopen: Alexandria motor under Argus

1. With reopen authorized: study frozen repo → decide reuse for **I. Motor**.  
2. Chaos remains **front door** for capture; Library shapes; motor under Argus owns spatial/structural runtime.  
3. “New Alexandria” = evolved architecture hosted by Argus — not incremental polish of the frozen repo UI.  
4. AF Realm vs Alexandria Realm merge ontology only by explicit contract.

---

## What Chaos should grow (compatibility features)

| Feature | Why |
|---------|-----|
| Fragment → block preview | See Library-shaped output before export |
| Deck → “candidate Parcour” label | Human placement without auto-geometry |
| Asset path discipline | Mirror `assets/<entryKey>/` naming on export |
| Stable ids on Fragments | Round-trip / superseded links |
| Vault package = handoff bundle | Reuse human review gate |

## What Chaos should **not** grow

| Anti-feature | Why |
|--------------|-----|
| 20-slot corridor editor | GateKeeper / Library / future motor ownership |
| Fib / Match cards engine | Already in LibraryBuild |
| Auto-create Alexandria Realm from AF Realm | Different ontology; needs reopen + contract |
| Silent overwrite of locus bodies | User agency (perpetual-evolution) |
| Embedding the frozen Godot stack into AF | Destination is evolved motor, not repo merge-as-is |

---

## Vault’s role

Vault remains **formation prep ≠ Memory**. Natural sequence:

```text
Chaos capture → (optional Argus relate) → Vault review → Library handoff → Argus / Alexandria motor
```

Vault can validate `exportReady` Fragments and attach a short formation brief for the Library author.

---

## Success criteria

1. A Chaos Deck can produce a handoff file Library imports without manual retyping of body text.  
2. No AF code path requires Godot or GK running while freeze holds.  
3. Namespaces AF Realm vs Alexandria Realm never collide in one id space.  
4. Docs and contracts distinguish **repo freeze** from **Argus = Alexandria +1 / motor** destination.  
5. Freeze respected until reopen; this note alone does not authorize Stage 3.

---

## Related

| Doc | Role |
|-----|------|
| [`alexandria-frozen-contract.md`](alexandria-frozen-contract.md) | Binding repo freeze + §0 destination |
| [`vault-training-layer-contract.md`](vault-training-layer-contract.md) | Vault ≠ Memory |
| [`argusforge-contract.md`](argusforge-contract.md) | Sealed AF vision |
| Alexandria `ORM/ORM-16-07-LocusBodyJsonViewer.md` | Block contract |
| Alexandria `ORM/LAYERS_REALM_PARCOUR_OBJECT.md` | Spatial layers |
