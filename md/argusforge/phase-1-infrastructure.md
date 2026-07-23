# ArgusForge — Phase 1 (Infrastructure Start)

**Status:** Active — implementation of **models and contracts only**  
**Date:** 2026-07-23  
**Depends on:** [phase-0-architecture.md](phase-0-architecture.md) (sealed)  
**Alexandria:** [alexandria-frozen-contract.md](alexandria-frozen-contract.md) — **FROZEN**; out of scope  

---

## State

| Item | Rule |
|------|------|
| Phase 0 architecture | **Sealed** — do not redesign |
| Alexandria | **FROZEN** — no features, no renderers, no spatial memory, no Realm/Parcour/Room/Locus spatial |
| Existing contracts | Do not mutate Phase 0 locks; Phase 1 **refines operational org** without replacing Memory Registry |
| Final UI / UX polish | **Out of scope** this phase |
| MTA Engine | **Reserved only** — do not implement behavior yet |

---

## Objective

Begin ArgusForge infrastructure.

Build **only** the models and contracts needed for:

```text
Chaos
  ↓
Argus Engine        (relations — “what relates to what?”)
  ↓
MTA Engine          (time & behavior — reserved; “what happens over time?”)
  ↓
Products            (MTA, ARGUS, Alexandria later, Vault…)
```

**Do not** build final interfaces. **Do not** optimize UX.

---

## Separation lock (critical)

| Engine | Answers | Must not |
|--------|---------|----------|
| **Argus Engine** | *What is related to what?* | Recurrence, spaced repetition, attention scoring, temporal priority |
| **MTA Engine** | *What happens to this over time?* | Graph relations, semantic discovery, link typing |

**MTA Engine is not a simple spaced-repetition motor.**  
It is the **temporal behavior engine of knowledge**: recurrence, patterns, usage frequency, attention, priority, temporal signals, scoring, reminders, statistical learning, longitudinal evolution.

If relations and recurrence are mixed, the same coupling problem returns. Products must be able to reuse either engine independently.

---

## 1. Chaos

Chaos is the **capture unit**.

It may grow indefinitely and may contain:

- text
- images
- PDF
- audio
- links
- notes
- derivatives
- metadata

**Rules:**

- No conceptual size limit.
- Not yet a learning unit.
- No spatial restrictions.
- Creates / registers identity via Memory Registry; raw bytes live in Capture staging (unowned) or a product store after promotion.
- Distinct from **Chaos Coordination** (`tools/Chaos` / public repo) until a later ADR merges them.

Code: `lib/argusforge/contracts/chaos.ts`

---

## 2. Operational organization

Create **only** operational organization — not semantic structure.

### States

| State | Rule |
|-------|------|
| **Active** | Default for a new Chaos |
| **Focus** | Manual **or** calculated (calculation later via MTA Engine signals — not implemented in Phase 1) |
| **Archive** | Preserves identity; does **not** delete relations |

### Folders

Within each state:

- folders
- subfolders
- no depth limit

**Folders are user organization only.**  
They **never** replace Argus Engine relations.

### Relation to Memory Registry (Phase 0)

Phase 0 locked Memory as **Registry** (identity + pointers), not a product database.

Phase 1 adds **operational placement** on registry entries:

- `operationalState`: Focus | Active | Archive  
- optional `folderPath` within that state  

This does **not** make Forge the owner of product bytes. It organizes **how the user sees registered identities**.

Code: `lib/argusforge/contracts/organization.ts`

---

## 3. Argus Engine

Responsible for:

- relations
- discovery
- enrichment
- semantic navigation

Example relation types (extensible):

- `related_to`
- `derived_from`
- `contradicts`
- `evidence_for`
- `expands`
- `summarizes`
- `references`

**Argus never depends on folders.**

Phase 1: contract + types only; facades over product stores come later.

Code: `lib/argusforge/contracts/argus-engine.ts`

---

## 4. AI

AI **does not** modify automatically.

May **propose** (always user acceptance):

- segmentation
- synthesis
- entities
- relations
- titles
- classification

Code: `lib/argusforge/contracts/ai-proposals.ts`

---

## 5. MTA Engine (reserved — do not implement)

Responsibility reserved clearly. **Argus must not implement any of these.**

MTA Engine will own:

- recurrence
- spaced repetition
- pattern detection
- usage frequency
- attention
- priority
- temporal signals
- scoring
- reminders
- statistical learning
- temporal evolution
- longitudinal analysis

Phase 1: **interface stub + documentation only** — no scoring, no schedulers, no reminders.

Code: `lib/argusforge/contracts/mta-engine.ts`

---

## 6. Alexandria

**Out of scope.** Do not create:

- Realm, Parcour, Room, spatial Locus
- Renderer, Memory Palace
- any spatial generation pipeline

See frozen contract + spatial research note (deferred).

---

## 7. Non-architectural note (deferred)

There is personal interest in a future optional **“MemoryOS Environment”** compatible with the visual experience of MemoryOS.

- Optional representation only  
- Does **not** influence ArgusForge  
- Does **not** modify architecture  
- Decision (20×20 vs adaptation) deferred until Alexandria reopen  

Do not implement or design this in Forge.

---

## Code layout (Phase 1)

```text
md/argusforge/phase-1-infrastructure.md   ← this file
lib/argusforge/
  index.ts
  contracts/
    chaos.ts
    organization.ts
    memory-registry.ts
    argus-engine.ts
    mta-engine.ts          ← reserved stub
    ai-proposals.ts
    index.ts
  store/
    types.ts
    json-registry.ts       ← thin identity index + chaos staging metadata (not product DB)
```

Runtime data (gitignored): `data/forge/` — registry index + capture staging metadata only.

---

## Acceptance (Phase 1 partial)

Done when:

1. This document is in the Library and indexed.
2. TypeScript contracts exist and typecheck.
3. MTA Engine is visibly reserved and empty of behavior.
4. No Alexandria / spatial / final UI code landed.
5. Chaos → Active default + folder org are expressible in types.
6. AI proposals require an acceptance field / pending status.

---

## Related

| Doc | Role |
|-----|------|
| [phase-0-architecture.md](phase-0-architecture.md) | Sealed map |
| [alexandria-frozen-contract.md](alexandria-frozen-contract.md) | Freeze |
| [alexandria-spatial-bottleneck-research.md](alexandria-spatial-bottleneck-research.md) | Deferred research |
| [README.md](README.md) | Index |
