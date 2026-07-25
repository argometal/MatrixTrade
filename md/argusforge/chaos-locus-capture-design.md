# Chaos locus capture + Argus Library-hybrid — design discussion

**Status:** Design discussion — **non-binding**, **no implementation in this note**  
**Date:** 2026-07-25  
**Audience:** product / architecture review before coding  
**Related:** [`chaos-to-library-alexandria-pipeline.md`](chaos-to-library-alexandria-pipeline.md) · [`alexandria-frozen-contract.md`](alexandria-frozen-contract.md) §0 · AF03 Chaos checklist

---

## 1. What this note assumes (clarified intent)

| Statement | Meaning |
|-----------|---------|
| Alexandria **repo** is frozen | Proven path preserved; not patched as final UI |
| **Argus = Alexandria +1** | Evolved Alexandria becomes **I. Motor** under Argus |
| **Godot** | Candidate spatial shell for that motor *if it remains the right fit* — not Chaos’s job |
| **Library is hybrid inside ArgusForge** | Former Library roles split across AF surfaces — not “port all of LibraryBuild into Chaos” |
| **Chaos** | Only the **locus capture / body builder** slice of Library |
| **Argus** | Takes structural Library roles (e.g. Parcour-like assembly, “castillos”) |

Chaos stays Chaos: fast dump of ideas.  
It still needs **full builder power** for text + images so a Fragment can leave Chaos already shaped for Alexandria / Vault — without becoming Library-the-product.

---

## 2. Responsibility split (proposal to discuss)

```text
┌─────────────────────────────────────────────────────────────┐
│ Chaos                                                       │
│  · Capture surface (dump OK)                                │
│  · Locus-body builder @ LibraryBuild parity (text + images) │
│  · Fragment = portable unit → Vault and/or Alexandria       │
│  · NOT Parcour admin, NOT castillos, NOT SRS, NOT Godot     │
└───────────────────────────┬─────────────────────────────────┘
                            │ handoff (export / Vault / later API)
┌───────────────────────────▼─────────────────────────────────┐
│ Argus  (Library hybrid + relation)                          │
│  · Relate Fragments / Decks / Realms                        │
│  · Parcour-like assembly anchored here                      │
│  · “Castillos” / palace construction (structure, not dump)  │
│  · Treemap / molecular / unit graph — ops + structure       │
│  · Host of future Alexandria motor (I. Motor)               │
└───────────────────────────┬─────────────────────────────────┘
                            │ formed packages / spatial runtime
┌───────────────────────────▼─────────────────────────────────┐
│ Alexandria motor (+ Godot if kept)                          │
│  · Spatial traversal / palace runtime                       │
│  · Consumes formed locus bodies + structural placement      │
└─────────────────────────────────────────────────────────────┘

Vault = human gate / formation prep between Chaos (and later Argus) and transfer.
```

### LibraryBuild → AF mapping (what goes where)

| Historical Library role | Proposed AF owner | Chaos? |
|-------------------------|-------------------|--------|
| Locus body editor (`p` / `img` / paste / drop / pick) | **Chaos** | **Yes — target 100% builder capture** |
| Block reorder / overview rail for long bodies | **Chaos** | Yes (builder hygiene) |
| Image roles needed for handoff (`content`, optional `hero`) | **Chaos** (minimal metadata) | Yes, thin |
| Match cards / Fib / FSRS / grades | Stay out / later Library-or-motor study | **No** |
| Parcour construction / corridor logic | **Argus** (castillos / structure) | **No** |
| Realm spatial admin / collage wall / GK maze | Argus → motor / Godot later | **No** |
| Viewer-as-study / evaluation | Not Chaos | **No** |
| Data-transfer packaging / snapshot / `runLibraryBuild` | Later reopen / tooling | **No** |

**Rule of thumb:** if it was “where you *wrote* the locus,” it is Chaos.  
If it was “how loci *sit in a path / castle / world*,” it is Argus (then motor).

---

## 3. Chaos scope — “builder capture at 100%”

### In scope (parity with Library *locus editor*, not whole Library)

Chaos Fragment (or Fragment body) must support construction equivalent to LibraryBuild’s locus authoring core:

1. **Typed blocks** aligned to ORM-16-07 authoring set used for pipeline: at least `p`, `img`; then `link`; optional thin `card` stub later.  
2. **Text blocks** — create, edit, multi-paragraph, no forced classification.  
3. **Images — full ingest triad** (today AF only has URL/prompt):  
   - file pick  
   - drag-drop onto capture surface  
   - clipboard paste (image → asset; text → `p`)  
4. **Live thumbnails** bound to stored asset / blob ref.  
5. **Reorder** blocks (↑↓ minimum; DnD welcome on web).  
6. **Asset hygiene** — stable ids/basenames so export to Alexandria does not rewrite content by hand.  
7. **Export / send** — one action path to **Vault**; one path toward **Alexandria handoff** package (file first; API only after reopen).  
8. **Dump-first UX** — empty deck / empty fragment still accepts paste/drop without ceremony.

### Explicitly out of Chaos

- Creating Parcours / castillos / spatial Realms as Alexandria worlds  
- SRS, Match engine, Fib, grades, due dates  
- Godot / GateKeeper / corridor slots  
- Pretending to be full LibraryBuild (PAO, collage wall admin, realm nuclear tools, etc.)  
- Auto-geometry or auto-placement into castles (Argus / human)

### Product tension (acknowledge)

| Tension | Stance for discussion |
|---------|------------------------|
| Chaos = dump vs rich builder | Rich **construction** of the *unit*; still **no obligation** to classify or place |
| Fragment vs multi-block locus | Prefer: one Fragment **is** one locus-body candidate (block array inside), not N one-kind items that must be glued later |
| Current AF `kind: text\|image\|…` items | Likely migrate toward **mixed body** (block list) as the default capture shape — keep legacy kinds as import views |
| localStorage binary | Builder parity needs blob strategy (IndexedDB / object URLs / later server) — decide before coding |

---

## 4. Argus scope — Library hybrid (structure)

Argus absorbs the “assembly” half of Library:

| Capability (working name) | Intent |
|---------------------------|--------|
| **Castillos** | Human/structural grouping of formed loci into palace-like wholes — Parcour spirit anchored in Argus, not in Chaos |
| **Parcour-like paths** | Ordered or related sequences across Fragments/Decks — relation + placement hints, not 3D editing |
| **Realm Treemap / molecular / units** | Operational + relational views already on that path |
| **Future I. Motor** | Evolved Alexandria under Argus; Godot candidate for runtime |

Argus does **not** become the dump inbox. It consumes (or points at) Chaos-built bodies and organizes them.

**Open naming:** “Castillo” vs reuse “Parcour” vs new AF term — decide later; do not invent sealed ontology here.

---

## 5. Pipeline (discussion shape)

```text
Chaos builder
  → Fragment.body = ORM-shaped blocks + assets
       ├─→ Vault (human review / formation prep)
       └─→ Alexandria handoff package (and later motor ingest)

Argus
  → attaches structure: castle / parcour-like / realm placement hints
  → does not re-author the locus body by default
```

Success for Chaos alone: a human can build a locus-quality body (text + images) in Chaos and ship it to Vault or export for Alexandria **without retyping or re-attaching media**.

Success for Argus hybrid: those bodies can be hung into castles / paths without Chaos growing castle UI.

---

## 6. Gap vs current AF03 Chaos (facts for discussion)

| Area | Today | Target (Chaos builder) |
|------|-------|------------------------|
| Capture kinds | Separate items: text / link / image URL / file stub | Mixed **block body** per Fragment (locus-like) |
| Images | URL prompt only; binary “not stored” | Pick + drop + paste + persist asset |
| Editor | Markdown-ish single body / prompts | Block stack editor (Library locus editor spirit) |
| Reorder | Item order in deck | Block order inside Fragment + deck order |
| Vault | Select items → prep package | Select Fragments whose bodies are already pipeline-shaped |
| Alexandria | Deferred | Handoff JSON matching ORM-16-07 (+ assets) |
| Argus | Treemap / graph / move fragment | + castle / parcour-like structure (separate slice) |

AF03 checklist said “do not reproduce Alexandria Library.”  
This design **does not** reproduce Library-the-product; it **does** take the **locus builder capture** slice as Chaos’s job, with Argus taking the rest of the hybrid.

---

## 7. Design slices (order to discuss — still no coding)

### Slice A — Chaos block body model

- Fragment stores `blocks[]` (ORM-aligned) + `assets[]` refs.  
- Deck still holds many Fragments.  
- Migration: wrap legacy `kind/body` into one `p` or one `img` block.

### Slice B — Chaos builder UI (capture parity)

- Block chrome: add `p` / `img` / `link`.  
- Ingest triad for images.  
- Reorder + thumbnail.  
- Keyboard paste on deck and on fragment surface.

### Slice C — Ship out

- “Send to Vault” uses block-aware package.  
- “Export Alexandria handoff” writes `af.chaos.library_handoff.v0` (+ asset folder or zip).  
- No live Alexandria API while repo freeze holds.

### Slice D — Argus castillos / parcour-like (separate)

- Structure only: which Fragments belong to which castle/path.  
- No locus body editor inside Argus (link out to Chaos).  
- Placement hints for future motor.

### Slice E — Motor / Godot (reopen)

- Out of this discussion’s build order; destination only.

---

## 8. Questions for decision (before any coding)

1. **Fragment = locus?** Confirm one Fragment ↔ one locus-body candidate (recommended).  
2. **Castillo naming** — working UI label vs keep Parcour internally.  
3. **Image persistence in prototype** — IndexedDB vs defer binary until server; URL-only is **not** 100% builder.  
4. **Thin `card` in Chaos?** Useful for pipeline or push to later?  
5. **Does Vault rewrite bodies?** Proposal: no — Vault reviews / gates; Chaos remains editor of capture record until Library/motor is source of truth post-import.  
6. **Argus castle before or after Chaos builder parity?** Proposal: **Chaos builder first** (unblocks pipeline); Argus structure can land in parallel only if it does not dilute capture work.

---

## 9. Non-goals for this discussion

- Implementing code, schemas in TS, or UI.  
- Merging frozen Alexandria repo.  
- Choosing final Godot vs other engine.  
- Porting Match / Fib / PAO / collage admin into AF.

---

## 10. One-line summary

**Chaos = Library’s locus capture builder (text + images at full construction capacity for Alexandria pipeline).  
Argus = Library hybrid for parcours / castillos / structure, and host of Alexandria +1 motor.  
Godot = spatial Alexandria if it earns that seat — not a Chaos feature.**

---

## Related

| Doc | Role |
|-----|------|
| [`alexandria-frozen-contract.md`](alexandria-frozen-contract.md) | Repo freeze + Argus = Alexandria +1 |
| [`chaos-to-library-alexandria-pipeline.md`](chaos-to-library-alexandria-pipeline.md) | Handoff package research |
| [`af03-chaos-interface-contract.md`](af03-chaos-interface-contract.md) | Current Chaos checklist (will need amend when this design is approved) |
| [`vault-training-layer-contract.md`](vault-training-layer-contract.md) | Vault ≠ Memory |
| Alexandria `LibraryBuild/lib/locus_editor.dart` | Reference builder behaviors |
| Alexandria `ORM/ORM-16-07-LocusBodyJsonViewer.md` | Block contract |
