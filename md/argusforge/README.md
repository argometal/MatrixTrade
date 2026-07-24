# ArgusForge — Documentation Index

**Start here** for ArgusForge vision, product surfaces, runtime truth, and direction.

| | |
|---|---|
| **Repo** | [github.com/argometal/MatrixTrade](https://github.com/argometal/MatrixTrade) |
| **App** | `/forge/*` inside MatrixTrade (Next.js) |
| **Production** | https://matrix-trade-theta.vercel.app/forge |
| **Parent index** | [`md/README.md`](../README.md) |
| **Sealed contract (prevails)** | [`argusforge-contract.md`](argusforge-contract.md) |

**Rule:** Do not contradict sealed contracts. No AF implementation is final. Do not reduce AF to a notes app, universal memory, or a single-AI chat wrapper. Do not treat `/forge/chaos` as functional Chaos. Do not reopen Alexandria from AF docs.

---

## Product loop

```text
Capture (Chaos) → Relate (Argus) → Observe time (MTA) → Prepare formation (Vault) → Coordinate (ArgusForge)
```

**Identity:** ArgusForge coordinates **human formation transfer** — not a journal clone, not Alexandria, not “ChatGPT with folders.”

| Stage | Role | Today |
|-------|------|-------|
| **Capture** | Chaos Deck + Fragments | Working browser-local ingest |
| **Relate** | Argus spatial / graph surfaces | **Experimental** Treemap + molecular graph |
| **Operate** | Home + Active/Archive lists | Traditional operational UI |
| **Prepare** | Vault handoff queue | Prototype review queue |
| **Time** | MTA Engine | Boundary reserved — not implemented in AF UI |
| **Space** | Alexandria | **FROZEN** |

---

## Status legend

| Label | Meaning |
|-------|---------|
| **Canonical — SEALED** | Binding vision — follow even if UI is incomplete |
| **Canonical** | Rule of construction — update when reality changes |
| **Implemented** | Shipped in `/forge`; may need QA |
| **Experimental** | Active lab surface — expect redesign |
| **In progress** | Iteration open |
| **Proposed** | Design only — not built |
| **Deferred** | Later; do not block current work |
| **FROZEN** | Must not implement or depend on |

**Rule:** When code and docs disagree, fix docs in the same iteration or mark the gap in [runtime-truth.md](runtime-truth.md).

---

## Reading order

### Track A — Constitution (read first)

1. [`argusforge-contract.md`](argusforge-contract.md) — **SEALED** identity, mission, component duties  
2. [`perpetual-evolution-contract.md`](perpetual-evolution-contract.md) — **SEALED** evolution, evidence, user agency  
3. [`vision-and-direction.md`](vision-and-direction.md) — **where we are / where we go** (Home vs Argus split)  
4. [`phase-0-architecture.md`](phase-0-architecture.md) — technical boundaries (Phase 0 CLOSED)  
5. [`alexandria-frozen-contract.md`](alexandria-frozen-contract.md) — Alexandria lock  

### Track B — How it works & ontology (UI working names)

6. [`how-argusforge-works.md`](how-argusforge-works.md) — surfaces, loops, what to open when  
7. [`ontology-working.md`](ontology-working.md) — Realm · Chaos Deck · Fragment · Molecule  
8. [`vault-training-layer-contract.md`](vault-training-layer-contract.md) — Vault ≠ Memory  

### Track C — Runtime, build, changelog

9. [`runtime-truth.md`](runtime-truth.md) — what ships today  
10. [`building-backlog.md`](building-backlog.md) — active queue  
11. [`changes-numbered.md`](changes-numbered.md) — CHANGE log (24-xx)  
12. [`af03-chaos-interface-contract.md`](af03-chaos-interface-contract.md) — Chaos checklist / DoD  

### Track D — Research (non-binding)

13. [`argus-graph-prototype.md`](argus-graph-prototype.md) — unit graph field note  
14. [`external-repo-patterns-research.md`](external-repo-patterns-research.md)  
15. [`alexandria-spatial-bottleneck-research.md`](alexandria-spatial-bottleneck-research.md) — deferred  

---

## One sentence

> ArgusForge coordinates Chaos capture, Argus relation, MTA time, and Vault formation prep — so human learning stays transferable — while Home stays operational and Argus stays the spatial laboratory.

---

## Code vs vision (surfaces)

| Surface | Route | Role today | Horizon |
|---------|-------|------------|---------|
| **Home** | `/forge` | Traditional operational summary | Keep stable |
| **Active list** | `/forge/active` | Administrative folder/deck list | Keep as list management |
| **Archive list** | `/forge/archive` | Administrative archive list | Keep; no silent auto-archive |
| **Argus Treemap** | `/forge/argus` | **Experimental** Realm MapTree | Deepen molecular language |
| **Realm graph** | `/forge/realm/[id]` | Molecular Chaos Deck bodies | Affinity → confirmable suggestions |
| **Chaos Deck** | `/forge/deck/[id]` | Fragments inside a deck | Capture quality, not ontology |
| **Vault** | `/forge/vault` | Prep / review queue | Formation packages |
| **Unit graph** | `/forge/argus/units` | Fragment-level engine prototype | Feed Engine, not Home |
| **Alexandria** | — | FROZEN | Future spatial product only |

**Fortuitous separation (keep):** Home + Active/Archive = traditional ops. Argus = experimental spatial/relational development.

---

## Canonical principle

```text
Products own data.
Memory owns identity.
Argus relates.
MTA observes time.
Chaos captures.
Vault prepares formation.
ArgusForge coordinates.
```

```text
Argus determines relationships.
MTA determines temporal behavior.
```

Usage / heat / decay must **not** invent semantic relations by themselves.

---

## Document map

### Constitution

| Doc | Status |
|-----|--------|
| [argusforge-contract.md](argusforge-contract.md) | Canonical — SEALED |
| [perpetual-evolution-contract.md](perpetual-evolution-contract.md) | Canonical — SEALED addendum |
| [alexandria-frozen-contract.md](alexandria-frozen-contract.md) | FROZEN |
| [phase-0-architecture.md](phase-0-architecture.md) | Canonical — Phase 0 CLOSED |
| [vault-training-layer-contract.md](vault-training-layer-contract.md) | Canonical |

### Vision & direction (library schema — Argus/Matrix style)

| Doc | Status |
|-----|--------|
| [vision-and-direction.md](vision-and-direction.md) | Canonical (working vision map) |
| [how-argusforge-works.md](how-argusforge-works.md) | Canonical (UI guide) |
| [ontology-working.md](ontology-working.md) | Canonical (working names) |
| [runtime-truth.md](runtime-truth.md) | Canonical (refresh when shipping) |
| [building-backlog.md](building-backlog.md) | Active queue |
| [changes-numbered.md](changes-numbered.md) | Changelog |

### Working contracts & prototypes

| Doc | Status |
|-----|--------|
| [af03-chaos-interface-contract.md](af03-chaos-interface-contract.md) | Working checklist |
| [argus-graph-prototype.md](argus-graph-prototype.md) | Prototype note |

### Research

| Doc | Status |
|-----|--------|
| [external-repo-patterns-research.md](external-repo-patterns-research.md) | Research |
| [alexandria-spatial-bottleneck-research.md](alexandria-spatial-bottleneck-research.md) | Deferred, non-binding |

---

## Known weaknesses (lean into each iteration)

1. Argus Treemap / molecular metrics are **provisional** (not MTA).  
2. Focus filter is pending intelligence — currently mirrors Active Realms.  
3. Affinity halos are structural placeholders — not confirmed relations.  
4. Browser `localStorage` only — disclose loss risk; no backend AF store yet.  
5. Unit graph and Realm graph are two scales — easy to confuse; keep labeled.  
6. DEBT-AF03-01 — create must not birth twin Active/Archive worlds.  

---

## Sibling libraries

| Product | Index |
|---------|-------|
| Matrix (trading) | [`../matrix/README.md`](../matrix/README.md) |
| ARGUS (evidence org) | [`../argus/README.md`](../argus/README.md) |
| Library root | [`../README.md`](../README.md) |
