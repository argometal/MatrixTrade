# ArgusForge (AF) — Phase 0 Architecture Contract

**Status:** Canonical — **Phase 0 CLOSED** (architecture only)  
**Abbreviation:** AF = ArgusForge  
**Date:** 2026-07-23  
**PR / branch intent:** Documentation and architecture before implementation  
**Rule:** No models, tables, endpoints, components, migrations, or UI in Phase 0.

This file is the **single canonical Phase 0 contract**. Other files under `md/argusforge/` link here; they must not restate contradictory rules.

---

## Canonical principle

ArgusForge (AF) is the **coordination environment** of the ecosystem.

AF is **not**:

- a new monolithic application;
- a new central database;
- a replacement for MTA;
- a replacement for ARGUS;
- a replacement for Alexandria.

**Canonical rule:**

```text
Products own data.
Memory owns identity.
Argus relates.
MTA observes time.
Chaos captures.
Vault prepares formation.
ArgusForge coordinates.
```

**Vision (prevails):** [`argusforge-contract.md`](argusforge-contract.md) — sealed ArgusForge Contract. This Phase 0 file is the technical map; it must not contradict the sealed vision.
---

## Official names (locked)

| Name | Role |
|------|------|
| **ArgusForge** (AF) | Coordination environment |
| **Chaos** | Initial ingest / cumulative capture unit |
| **Memory Registry** | Stable identity + pointers + necessary shared context — *what does the system know?* |
| **Argus Engine** | Relations — *what is related to what?* |
| **MTA Engine** | Temporal behavior — *what happens over time?* |
| **ARGUS** | Private evidence product (unchanged) |
| **MTA** | Trading product (unchanged) |
| **Vault** | Prepares formation / context for a recipient or task — see [`vault-training-layer-contract.md`](vault-training-layer-contract.md) and sealed [`argusforge-contract.md`](argusforge-contract.md) §11 |
| **Alexandria** | 3D knowledge product — **FROZEN** |

**Forbidden names:** MTA Intelligence · Argus Core · Shared Engine · Forge Database · Memory Database.

**Do not confuse:** Memory Registry (system knowledge identity) ≠ Vault (AI training interface). Full Vault contract: [`vault-training-layer-contract.md`](vault-training-layer-contract.md).

### Ecosystem model

```text
Chaos captures
Memory Registry identifies
Argus Engine relates
MTA Engine observes time and patterns
Vault prepares formation
Products own and use their data
ArgusForge coordinates the ecosystem
```---

## 1. Chaos — canonical definition

Chaos is the **initial ingest unit**.

It may receive and accumulate an indefinite amount of:

- text;
- images;
- PDF;
- audio;
- links;
- notes;
- events;
- fragments;
- files;
- derivatives;
- metadata.

Chaos may grow for days, months, or years.

Chaos does **not** need to:

- be clean;
- make complete sense;
- be segmented;
- belong immediately to a Topic;
- represent a learning unit;
- obey spatial restrictions;
- hold a fixed number of elements.

**Chaos is cumulative capture.**

### Chaos ≠ Locus

Preserve this distinction (do **not** implement Locus in Phase 0):

> A **Locus** is an already delimited, synthesized, and evaluable unit that may be derived from one or more Chaos.

Do not design Chaos as a fixed “card.” It is an accumulating ingest vessel.

**Note:** Chaos Coordination (`tools/Chaos` / public repo) remains a separate handoff channel until a later ADR. This contract defines **Chaos Capture** as the AF ingest unit.

---

## 2. Chaos cycle

```text
Capture
  → Chaos
  → Growth
  → Segmentation proposals
  → Synthesis proposals
  → Enrichment
  → Relationships
  → Temporal observation
  → Product-specific use
```

AI may **propose**:

- segmentation;
- titles;
- synthesis;
- entities;
- duplicates;
- relations;
- classification;
- derived units.

In the initial stage, AI must **not** alter content or create definitive relations without **explicit user confirmation**.

---

## 3. Operational organization

Primary states / views:

| State | Rule |
|-------|------|
| **Active** | Default birth state for a new Chaos |
| **Focus** | Current or priority attention — manual now; later may also be suggested by MTA Engine |
| **Archive** | Preserves identity, content references, and relations |

Additional rules:

- Archiving is **not** deletion.
- Changing state does **not** create a new KEY.
- These states do **not** replace manual organization (folders).

---

## 4. Folders and subfolders

The user may organize content with folders and subfolders of variable depth (filesystem-like).

| Mechanism | Answers |
|-----------|---------|
| **Folders** | *Where do I want to find or view this?* |
| **Argus relations** | *What is this actually related to?* |

Rules:

- Folders are **not** identity.
- Moving a Chaos does **not** change its KEY.
- Folders are **not** Argus relations.
- Folders do **not** replace Topics, entities, or semantic relations.
- No maximum depth imposed in Phase 0.
- Do **not** force Focus / Active / Archive to be mandatory physical folders if they are defined as views/states.

### Three distinct layers

| Layer | Meaning |
|-------|---------|
| **1. Operational state** | Focus / Active / Archive — attention & lifecycle view |
| **2. Manual location** | Folder / subfolder path — user browsing organization |
| **3. Semantic relation** | Argus Engine edges — evidence-backed relatedness |

These three must never be collapsed into one concept.

---

## 5. Memory Registry

Memory Registry maintains:

- stable **KEY**;
- registered type;
- state;
- references;
- location of owner content;
- origin;
- cross-product links;
- strictly necessary shared context.

Memory Registry must **not**:

- copy all product content;
- become a universal archive;
- become another proprietary database;
- absorb MTA or ARGUS stores.

**Products remain owners of their data.**

Memory answers *what the system knows* (identity + pointers + necessary context).  
It is **not** Vault. Vault answers *what context the AI needs to continue correctly* — [`vault-training-layer-contract.md`](vault-training-layer-contract.md).

---

## 6. Argus Engine

Argus Engine answers:

> *What is related to what, and by what evidence or link type?*

**Reserved responsibilities:**

- relations;
- entities;
- evidence;
- dependency;
- contradiction;
- continuation;
- derivation;
- expansion;
- reference;
- similarity;
- conceptual belonging;
- neighborhood navigation;
- minimal relational context for AI.

Argus Engine must **not** own:

- spaced repetition;
- temporal recurrence;
- priority by frequency;
- longitudinal pattern detection;
- reminders;
- agenda;
- temporal scoring.

**Do not design the definitive relation schema in Phase 0.**

Future design must study this pattern (see [external-repo-patterns-research.md](external-repo-patterns-research.md)):

```text
source content
  → extraction
  → graph
  → incremental update
  → targeted context
```

---

## 7. MTA Engine

MTA Engine is **not** only spaced repetition.

It answers:

> *What happens to this content, relation, or activity over time?*

**Reserved responsibilities:**

- recurrence;
- repeatability;
- usage frequency;
- access frequency;
- temporal patterns;
- pattern detection;
- attention;
- Focus signals;
- priority;
- scoring;
- agenda;
- reminders;
- longitudinal evolution;
- behavior changes;
- trends;
- intervals;
- metrics;
- statistical learning from use.

**Strict rule:**

```text
Argus determines relationships.
MTA determines temporal behavior.
```

- A semantic relation must **not** depend on usage frequency.
- High usage frequency must **not** automatically become a semantic relation.

---

## 8. Products and engines

See [Official names](#official-names-locked) and [Ecosystem model](#ecosystem-model) above.

Existing products (MTA, ARGUS) stay in place. AF does not move or replace them.

---

## 9. Alexandria

Alexandria remains **FROZEN**.

Binding contract: [`alexandria-frozen-contract.md`](alexandria-frozen-contract.md).

Phase 0 must **not** define:

- render pipeline;
- spatial AI;
- environment reconstruction;
- 3D engine;
- Realm / Parcour / Room / slots;
- technical integration;
- detailed exchange contracts.

Phase 0 limits for Alexandria:

- preserve repository and mechanics;
- AF must not depend on Alexandria;
- Alexandria must not block AF;
- reopen only via a dedicated phase.

The spatial research note is **not** a resolved AF direction. See [`alexandria-spatial-bottleneck-research.md`](alexandria-spatial-bottleneck-research.md) (deferred, non-binding).

---

## 10. MemoryOS note (non-architectural)

There is personal interest in someday preserving an optional environment inspired by or compatible with spaces previously memorized in MemoryOS. This does **not** define Alexandria, AF, Chaos, Argus Engine, or MTA Engine; it sets no global sizes; it must not be implemented now. Possible geometries (20×20, 10×10, or other) remain undecided until a future Alexandria reopen.

---

## 11. Reference repositories

Brief research note (no code, no dependencies): [`external-repo-patterns-research.md`](external-repo-patterns-research.md).

| Repo | When | Priority |
|------|------|----------|
| tirth8205/code-review-graph | Before designing Argus Engine | **High** |
| likec4/likec4 | When designing relational visualization | Medium (after relation model) |
| koala73/worldmonitor | Multi-source ingest maturity | Future |
| rohitg00/ai-engineering-from-scratch | Formalizing AI workflows | Future |
| schollz/croc | Bridge / Data-transfer only | Outside AF core |

---

## 12. Phase 0 boundary (closed)

Phase 0 closes **only**:

- AF identity;
- product and engine boundaries;
- Chaos definition;
- operational organization;
- folders vs relations;
- Argus Engine responsibilities;
- MTA Engine responsibilities;
- Memory Registry;
- Alexandria freeze;
- future references.

**Phase 0 does not implement Phase 1.**  
No code, schemas, endpoints, or UI on this closure.

---

## Placement in this repository (docs only)

```text
md/argusforge/                    ← AF library (this contract + linked notes)
```

Future implementation islands (not opened by Phase 0):

- `lib/argusforge/` — deferred
- `app/forge/` — deferred

Do not modify product trees (`app/(trading)`, `app/argus`, `lib/argus`, `tools/Chaos`) for AF Phase 0.

---

## Related documents

| Document | Role vs this contract |
|----------|------------------------|
| [README.md](README.md) | Index only — links here |
| [argusforge-contract.md](argusforge-contract.md) | **Sealed vision** — prevails for mission and identity |
| [vault-training-layer-contract.md](vault-training-layer-contract.md) | **Canonical Vault** — prepares formation ≠ Memory |
| [alexandria-frozen-contract.md](alexandria-frozen-contract.md) | Binding Alexandria freeze |
| [alexandria-spatial-bottleneck-research.md](alexandria-spatial-bottleneck-research.md) | Deferred non-binding research |
| [external-repo-patterns-research.md](external-repo-patterns-research.md) | External pattern references |

---

## Acceptance of Phase 0 closure

1. This document is the canonical AF Phase 0 contract.
2. Official names and the canonical principle are locked.
3. Argus Engine and MTA Engine remain separated.
4. Alexandria remains FROZEN; spatial note is non-binding.
5. No implementation landed for AF Phase 0 closure.
