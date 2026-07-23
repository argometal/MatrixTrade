# ArgusForge — Foundation (Phase 0)

**Status:** Canonical proposal — architecture only  
**Date:** 2026-07-23  
**Scope:** Where ArgusForge lives inside the MatrixTrade repository, how products and engines relate, and how to integrate without rewrites.  
**Rule:** No implementation code in this phase. Prefer adapters over migrations. Prefer contracts over coupling. Nothing existing should stop working.

**Rescue mandate:** ArgusForge integrates existing systems progressively. Every decision must maximize reuse and minimize rewrites.

---

## 0. Naming (locked)

| Name | Role | Identity rule |
|------|------|---------------|
| **ARGUS** | Product — private evidence / legal / relationships | Remains at `/argus/*`. Does not move. |
| **Argus Engine** | Reusable relationship logic | *What is it, where does it fit, what does it relate to?* |
| **MTA** | Product — trading / experiment control | Remains on trading routes. Does not move. |
| **MTA Engine** | Reusable recurrence & quantification logic | *How often, how it evolves, why it deserves attention?* |
| **ArgusForge** | Hub — integration environment | Not another application. Not a database. |
| **Chaos** | General entry — capture first, organize later | First public module of ArgusForge. |
| **Memory** | Persistent logical memory | Nothing deleted; nothing “moved”; states are calculated. |
| **Vault** | AI output interface | Future product surface. |
| **Alexandria** | Human output interface | Future product surface. |
| **Focus / Active / Archive** | Calculated states of Memory | **Not folders.** Views over Memory. |

**Forbidden names for this architecture:** Intelligence, Core, Shared Engine, MTA Intelligence, or any second artificial identity for MTA.

### Contractual definitions

**Argus Engine**  
Answers: *What is it, where does it fit, and what does it relate to?*  
Entities, evidence, links, placement, grouping, contextual location.

**MTA Engine**  
Answers: *How many times does it occur, how does it evolve, and why does it deserve attention?*  
Usage, recurrence, temporal behavior, hypotheses, attention / Focus calculation.

---

## 1. Where ArgusForge should live inside the repository

### Current reality (must not break)

| Surface | Location today | Ownership |
|---------|----------------|-----------|
| MTA (Trading) | `app/(trading)/**`, `lib/*` (non-argus), `data/*.json`, `vault/Trades/` | Trading product |
| ARGUS | `app/argus/**`, `lib/argus/**`, `data/argus/` (gitignored), `md/argus/` | Evidence product |
| Shared host only | `middleware.ts`, `lib/auth/*`, Next.js app shell | Auth + routing |
| Chaos (coordination today) | `tools/Chaos/` (mirror) + external public repo `argometal/Chaos` | IA handoffs / STATUS / logs — **not** product capture yet |
| Library | `md/` | Architecture truth |

Today the repo already hosts **two products, one Next.js process**. ARGUS is nested without being a standalone app. ArgusForge extends that nesting model — it does **not** introduce a third deployable application.

### Placement decision

ArgusForge lives as a **documentation + contract + thin adapter island** inside this repo:

```text
md/argusforge/          ← constitution (this doc + follow-ons)
lib/argusforge/         ← adapters & contracts ONLY (future; empty until Phase 1)
app/forge/              ← optional thin hub UI later (Chaos first); NOT required in Phase 0
```

**Not** a new top-level product repo.  
**Not** a new database.  
**Not** a move of `app/argus` or trading routes.

### Host model

```text
┌──────────────────────────────────────────────────────────┐
│  MatrixTrade repository (single Next.js host)            │
│                                                          │
│   / … trading …     ← MTA product                        │
│   /argus/*          ← ARGUS product                      │
│   /forge/*          ← ArgusForge hub (Chaos first)       │
│                                                          │
│   lib/argus/        ← ARGUS product code                 │
│   lib/mta/          ← optional future peel of trading    │
│                       logic into MTA Engine adapters     │
│   lib/argusforge/   ← contracts + adapters (hub)         │
│                                                          │
│   md/argusforge/    ← umbrella architecture              │
└──────────────────────────────────────────────────────────┘
```

**Principle:** Products keep their data and routes. ArgusForge never becomes the owner of ARGUS journal or MTA trades.

---

## 2. How Chaos should integrate without affecting MatrixTrade

### Two meanings of “Chaos” (must stay explicit)

| Chaos (today) | Chaos (ArgusForge) |
|---------------|--------------------|
| Coordination channel for AIs (`tools/Chaos/`, public repo) | Low-friction **capture entry** — everything enters here first |
| STATUS, logs, decisions, handoffs | Raw captures into Memory (append-only) |
| Must keep working unchanged | New module; must not rewrite trading or ARGUS |

Until a deliberate merge plan exists, treat them as:

- **Chaos Coordination** — existing handoff system  
- **Chaos Capture** — ArgusForge entry module  

Phase 0 does **not** rename or relocate `tools/Chaos/`. Capture may later *link* to coordination logs via adapters; it must not break the “always push Chaos” ritual.

### Integration rules for Chaos Capture

1. **Capture first** — no type/entity/folder required at write time (same spirit as ARGUS design principle #1).
2. **Write only to Memory** (logical store) via a Chaos → Memory contract.
3. **Do not write** into `data/trades.json`, `vault/Trades/` frontmatter, or `data/argus/journal.json` directly.
4. **Promotion is explicit** — adapters may *propose* placement into ARGUS or MTA; humans (or existing Apply gates) accept.
5. **UI island** — if/when UI exists, mount at `/forge/chaos` (or `/forge`) with its own layout; no changes to MTA preview shell or ARGUS v2 shell required.
6. **Phone-first** — capture path must work with the same friction constraints as mobile ARGUS/MTA (short form, append, done).

### Non-impact guarantee

| Existing path | Chaos Capture may… | Must not… |
|---------------|--------------------|-----------|
| MTA routes / inbox Apply | Read public summaries later via contract | Alter trade Apply pipeline |
| ARGUS inbox / journal | Propose entity/evidence links via Argus Engine adapter | Bypass ARGUS immutability / ownership |
| `middleware.ts` auth | Add `/forge` to an auth bucket when UI exists | Change MTA or ARGUS password semantics |
| Supabase tables `argus_*` / trades | — | Create parallel “forge_*” product DBs in Phase 0–1 |

---

## 3. How future engines should be isolated

### Product vs Engine vs Hub

```text
PRODUCTS (UX + owned data)          ENGINES (reusable logic)         HUB
─────────────────────────          ─────────────────────────        ────
ARGUS  ──uses──► Argus Engine  ──adapters──►  ArgusForge
MTA    ──uses──► MTA Engine    ──adapters──►  ArgusForge
Vault (future)                 ──reads──►     Memory views
Alexandria (future)            ──reads──►     Memory views
Chaos                          ──writes──►    Memory
```

### Isolation rules

1. **Engines have no UI.** They are libraries behind contracts.
2. **Engines do not own persistence.** Products (and Memory) own stores.
3. **Engines are called through adapters** in `lib/argusforge/adapters/*` or product-local wrappers — never by importing deep ARGUS UI internals from MTA or vice versa.
4. **Extraction before sharing:**  
   - Argus Engine starts as *facades over existing* `lib/argus/*` relationship helpers — not a rewrite.  
   - MTA Engine starts as *facades over existing* recurrence / attention / metrics helpers already in trading `lib/` — not a new analytics product.
5. **No cross-product imports of page components.** Only contracts and DTO types.
6. **Calculated views live in Memory**, not in engines: Focus / Active / Archive are Memory projections that may *call* MTA Engine for scores and Argus Engine for placement hints.

### Engine boundaries (contract questions)

| Engine | In scope | Out of scope |
|--------|----------|--------------|
| **Argus Engine** | Entity identity, evidence linkage, grouping, contextual placement suggestions | Trade P/L, experiment cycle rules, AI chat UX |
| **MTA Engine** | Recurrence counts, temporal patterns, hypothesis tracking, attention / Focus signals | Legal evidence packages, relationship network UI |

---

## 4. Suggested folder structure

### Phase 0 (docs only — this PR)

```text
md/argusforge/
  README.md                      ← index
  phase-0-architecture.md        ← this document (canonical)
  glossary.md                    ← locked names (optional companion)
```

### Phase 1+ (structure reserved — do not invent early)

```text
md/argusforge/
  contracts/
    chaos-capture.md
    memory.md
    argus-engine.md
    mta-engine.md
    vault-output.md
    alexandria-output.md
  adapters/
    existing-systems-map.md      ← maps today’s files → contracts

lib/argusforge/
  contracts/                     ← TypeScript types mirroring md contracts
  adapters/
    argus/                       ← thin wrappers over lib/argus (no move)
    mta/                         ← thin wrappers over trading lib (no move)
    chaos-coordination/          ← optional bridge to tools/Chaos
  memory/                        ← calculated views: focus | active | archive
  chaos/                         ← capture API helpers (append-only)

app/forge/                       ← hub UI island (Chaos first)
  layout.tsx
  page.tsx                       ← hub home
  chaos/page.tsx                 ← capture
  memory/page.tsx                ← views (Focus / Active / Archive)
```

### Explicit non-moves

| Path | Action |
|------|--------|
| `app/argus/**` | Stay |
| `lib/argus/**` | Stay; Argus Engine *adapts* |
| `app/(trading)/**` | Stay |
| Trading `lib/*` | Stay; MTA Engine *adapts* |
| `tools/Chaos/**` | Stay as Chaos Coordination until a separate ADR merges capture + coordination |
| `data/argus/**`, trades stores | Stay owned by products |

---

## 5. Suggested contracts

Contracts are **interfaces**, not tables. Prefer JSON/Markdown payloads that existing Apply / Inbox patterns already understand.

### 5.1 Chaos Capture → Memory

```text
ChaosCaptureEvent
  id
  capturedAt
  rawText            ← immutable
  source             ← phone | web | import | ai-handoff | …
  attachments[]?
  labels[]?          ← optional, never required
  memoryState        ← always derived later; not set by capturer
```

**Rule:** Capture never sets Focus / Active / Archive. Those are calculated.

### 5.2 Memory

```text
MemoryRecord
  id
  createdAt
  rawRef             ← pointer to immutable capture
  links[]            ← optional refs: argus entity, trade id, doc id, …
  annotations[]      ← AI or human overlays; never replace raw
```

**Calculated states (views, not storage folders):**

| State | Meaning (initial definition — refine in later ADR) |
|-------|-----------------------------------------------------|
| **Focus** | Deserves attention now (MTA Engine signals + recency + open loops) |
| **Active** | In play; linked or recently used; not closed |
| **Archive** | Retained forever; not in Focus/Active; still searchable |

Nothing is deleted. “Archive” does not relocate bytes; it changes view membership.

### 5.3 Argus Engine

```text
ArgusEngine
  resolveEntities(text|refs) → EntityHint[]
  suggestLinks(record) → LinkSuggestion[]
  suggestPlacement(record) → PlacementHint   ← where it fits contextually
  group(records) → GroupHint[]
```

Implemented first as adapters calling existing ARGUS helpers (`lib/argus/*`). Product ARGUS remains source of truth for evidence persistence.

### 5.4 MTA Engine

```text
MtaEngine
  measureUsage(subject) → UsageStats
  measureRecurrence(subject) → RecurrenceStats
  temporalPattern(subject) → TemporalStats
  listHypotheses(subject) → Hypothesis[]
  attentionScore(subject) → AttentionSignal   ← feeds Memory Focus view
```

Implemented first as adapters over existing trading metrics / attention / observation code. Product MTA remains source of truth for trades and experiment rules.

### 5.5 Vault (AI output)

```text
VaultExportRequest
  scope              ← memory view | record ids | product slice
  audience           ← model / grant TTL / purpose
  format             ← md | json | sectioned-snapshot
```

Reuses patterns already proven: scoped AI grants, sectioned snapshots, inbox proposals. Vault **reads** Memory + product slices; it does not become a second journal.

### 5.6 Alexandria (human output)

```text
AlexandriaPackageRequest
  scope
  format             ← md | html | pdf | zip (ladder already in ARGUS deliver docs)
  narrative          ← human-facing package
```

Reuses ARGUS deliver/export ladder where applicable; does not fork a parallel export stack until necessary.

### 5.7 Hub orchestration (ArgusForge)

```text
Forge does:
  route capture → Memory
  ask Argus Engine for placement/links (suggestions)
  ask MTA Engine for attention/recurrence (signals)
  expose Memory views
  later: feed Vault / Alexandria

Forge does not:
  own trade numbers
  own ARGUS journal truth
  auto-apply into products without existing human gates
```

---

## 6. Migration strategy

**Nothing migrates in Phase 0.** Phase 0 seals the map.

| Stage | Goal | Reuse | Forbidden |
|-------|------|-------|-----------|
| **0 — Map** | This document + glossary; index in `md/README.md` | Existing island pattern (ARGUS-in-host) | Code, new DB, new app |
| **1 — Chaos Capture stub** | Append-only capture + Memory record list (local JSON or md) | Capture-first UX lessons from ARGUS; phone habits from MTA | Writing into ARGUS/MTA stores |
| **2 — Adapters** | Argus Engine + MTA Engine facades over *existing* functions | `lib/argus/*`, trading attention/metrics | Moving folders; renaming products |
| **3 — Views** | Focus / Active / Archive as queries | MTA Engine attentionScore + simple recency rules | Physical archive folders |
| **4 — Hub UI** | `/forge` island linking Chaos + Memory views | Same nesting as `/argus` | Merging sidebars with ARGUS/MTA |
| **5 — Outputs** | Vault + Alexandria as export adapters | Scoped grants, deliver packages | New standalone apps |
| **6 — Optional peel** | Extract shared helpers *behind* engine facades only when duplication hurts | Copy-on-write extraction | Big-bang “shared core” rewrite |

### Adapter-first rule

```text
Existing function  →  Adapter (lib/argusforge/adapters/…)  →  Contract
```

If an adapter is hard to write, the contract is wrong — fix the contract, do not rewrite the product.

### Data strategy

- **Phase 0–1:** no new database. Local append-only files under a forge-owned path (e.g. `data/forge/` gitignored like ARGUS private data) *or* Markdown under a forge vault folder — decide in Phase 1 ADR, not here.
- **Later:** index/search may use Supabase **only as an index**, never as replacement for product sources of truth (same lesson as Markdown canon + query layer).

---

## 7. Risks

| Risk | Why it happens | Mitigation |
|------|----------------|------------|
| **Name collision: Chaos** | Coordination repo vs capture module | Keep “Chaos Coordination” vs “Chaos Capture” explicit until an ADR merges them |
| **Forge becomes a third app** | UI enthusiasm | Hub only; no separate deploy; no separate auth product identity unless required |
| **Engine rewrite temptation** | “Clean” shared core | Facades only; forbid Intelligence/Core naming; extract only under pain |
| **Silent coupling** | Importing `app/argus` components into forge | Contract + adapter lint/review; no cross-product UI imports |
| **Memory as folders** | Habit from notes apps | Document Focus/Active/Archive as views in every ADR; no archive directory as truth |
| **Auto-write into ARGUS/MTA** | Convenience | Reuse human Apply gates; Chaos never bypasses product ownership |
| **Second database** | Premature Supabase | Index later; canon stays append-only / product-owned |
| **Scope creep into RAZ/Vault product UI** | Parallel conversations | Vault/Alexandria are output interfaces under Forge contracts — products stay independent |
| **Docs drift** | Code invented without map | Phase gate: no feature without naming which contract it fulfills |
| **Breaking existing islands** | Shared middleware edits | Additive route buckets only; regression: `/`, `/argus/*` keep current behavior |

---

## 8. Phase 0 acceptance criteria

Phase 0 is done when:

1. This document is accepted as the umbrella map.
2. Names above are treated as locked.
3. No implementation PR starts without citing: product vs engine vs hub vs view.
4. Next phase opens with a **Chaos Capture contract** ADR — still adapter-first, still no product moves.

---

## 9. Immediate non-goals

- No `/forge` UI yet (unless a later phase explicitly opens it).
- No extraction of `lib/argus` into a package.
- No merge of Chaos Coordination into Capture.
- No RAZ/Vault egg that bypasses this map (future Vault = output interface here).
- No “Shared Engine” / “Intelligence” layer.

---

## Related existing truth (reuse anchors)

| Existing doc / pattern | Reuse as |
|------------------------|----------|
| ARGUS island in host (`/argus/*`) | Template for `/forge/*` nesting |
| Capture-first + AI annotates never rewrites | Chaos + Memory rules |
| Trading inbox Apply gate | Promotion into MTA |
| Scoped AI grants / sectioned snapshots | Vault output pattern |
| ARGUS deliver ladder | Alexandria output pattern |
| `tools/Chaos` STATUS/log ritual | Chaos Coordination (unchanged) |
| `md/` Library tiers | Home for `md/argusforge/` |

---

## Decision summary

**ArgusForge** = integration hub inside the existing MatrixTrade repository.  
**Chaos** = first entry module (capture), without disturbing MTA or ARGUS.  
**Memory** = persistent logical store with calculated Focus / Active / Archive.  
**Argus Engine** / **MTA Engine** = reusable logic via adapters, not new identities or rewrites.  
**Vault** / **Alexandria** = output interfaces (AI / human), later.  

Nothing existing stops working. Nothing moves. Contracts before code.
