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
| **ARGUS** | Product — private evidence / legal / relationships | Remains at `/argus/*`. Does not move. Owns **Argus Store**. |
| **Argus Engine** | Reusable relationship logic | *What is it, where does it fit, what does it relate to?* |
| **MTA** | Product — trading / experiment control | Remains on trading routes. Does not move. Owns **MTA Store**. |
| **MTA Engine** | Reusable recurrence & quantification logic | *How often, how it evolves, why it deserves attention?* |
| **ArgusForge** | Hub — integration environment | Not another application. **Not a database.** |
| **Chaos** | General entry — capture first, organize later | First public module of ArgusForge. May own a **Capture staging store** for unowned raw bytes — never “Memory”. |
| **Memory Registry** | Unified identity + context contract | **Not storage.** Registers the known universe via pointers. Also called **Memory** for short. |
| **Vault** | AI output interface | Future product surface. |
| **Alexandria** | Complete 3D knowledge product — **FROZEN** external | Not in Forge. See [`alexandria-frozen-contract.md`](alexandria-frozen-contract.md). Future human spatial knowledge; Gatekeeper = traversal only. |
| **Focus / Active / Archive** | Calculated states over the Registry | **Not folders.** Views over registry entries (+ product metadata via adapters). |

**Forbidden names for this architecture:** Intelligence, Core, Shared Engine, MTA Intelligence, or any second artificial identity for MTA.

**Forbidden for Memory:** Database, Archive (as a store), Storage, “Forge DB”, “universal data lake”.

### Contractual definitions

**Argus Engine**  
Answers: *What is it, where does it fit, and what does it relate to?*  
Entities, evidence, links, placement, grouping, contextual location.

**MTA Engine**  
Answers: *How many times does it occur, how does it evolve, and why does it deserve attention?*  
Usage, recurrence, temporal behavior, hypotheses, attention / Focus calculation.

**Memory Registry**  
Answers: *What identities exist in the universe, and where does the real data live?*  
Common identity + pointers + shared context. Never the bytes of trades, evidence, or loci.

---

## 0.1 Critical decision — Memory does not live in ArgusForge

This is the most important architectural decision in ArgusForge.

**Memory is a contract, not a database.**

Today knowledge already lives in many stores:

| Product | Store reality (examples) |
|---------|--------------------------|
| MTA / MatrixTrade | Markdown / Obsidian, JSON, future Postgres / Supabase |
| ARGUS | Own journal / inbox data (`data/argus/`, Supabase `argus_*`, …) |
| Alexandria | Own store (e.g. SQLite historically) — **product FROZEN**; do not integrate now |
| Future | Graph DB, object store, anything |

If Memory “lives” inside ArgusForge as storage, every product migration becomes a Forge migration. That violates the rescue principle.

### Correct mental model

```text
                 ArgusForge
                    │
                  Chaos
                    │
                    ▼
              Memory API
           (Memory Registry)
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   Argus Store  MTA Store  Alexandria Store
   (evidence)   (trades…)  (loci / human KB)
        …           …            …
```

**Memory is not the storage.**  
**Memory is the logical view of all known knowledge** — via identity and pointers.

### Examples (pointer identity)

A trade already exists — **do not copy it**:

```text
Memory Entry
  source   = MTA          (or MatrixTrade)
  id       = ST-MSFT
  pointer  = matrix://…
```

Evidence already exists in ARGUS:

```text
Memory Entry
  source   = ARGUS
  pointer  = argus://…
```

A Locus may exist in Alexandria (frozen product — pointer reserved for later):

```text
Memory Entry
  source   = Alexandria
  pointer  = alex://…          ← scheme reserved; no adapter until reopen study
```

**Do not implement `alex://` resolvers, packages, or schemas now.** See [`alexandria-frozen-contract.md`](alexandria-frozen-contract.md).

**Memory never owns the datum. Memory owns the common identity.**

### Git analogy

| Git | ArgusForge |
|-----|------------|
| Working tree holds file contents | Product stores hold real data |
| Git records history / identity of changes | Memory Registry records identity + pointers |
| Checkout does not invent a second filesystem of truth | Forge does not invent a second database of truth |

### Ownership split (locked)

| Owner | Owns |
|-------|------|
| **Products** (ARGUS, MTA, …) | Their data (bytes, schemas, migrations) |
| **Alexandria** (frozen) | Its own store when reopened; **not** a Forge dependency now |
| **Memory Registry** | Shared identity + context + pointers |
| **Argus Engine / MTA Engine** | Enrichment of that identity (relations / metrics) |
| **Chaos** | Creation of **new identities** when no product owns them yet; optional **Capture staging** for raw bytes until promotion |

That prevents the largest Forge risk: becoming “the new database of everything”. Forge becomes the **unified registry of knowledge** while each product keeps ownership of its information.

---

## 1. Where ArgusForge should live inside the repository

### Current reality (must not break)

| Surface | Location today | Ownership |
|---------|----------------|-----------|
| MTA (Trading) | `app/(trading)/**`, `lib/*` (non-argus), `data/*.json`, `vault/Trades/` | Trading product → **MTA Store** |
| ARGUS | `app/argus/**`, `lib/argus/**`, `data/argus/` (gitignored), `md/argus/` | Evidence product → **Argus Store** |
| Shared host only | `middleware.ts`, `lib/auth/*`, Next.js app shell | Auth + routing |
| Chaos (coordination today) | `tools/Chaos/` (mirror) + external public repo `argometal/Chaos` | IA handoffs / STATUS / logs — **not** product capture yet |
| Library | `md/` | Architecture truth |

Today the repo already hosts **two products, one Next.js process**. ARGUS is nested without being a standalone app. ArgusForge extends that nesting model — it does **not** introduce a third deployable application or a universal store.

### Placement decision

ArgusForge lives as a **documentation + contract + thin adapter island** inside this repo:

```text
md/argusforge/          ← constitution (this doc + follow-ons)
lib/argusforge/         ← adapters, Memory API, contracts ONLY (future)
app/forge/              ← optional thin hub UI later (Chaos first); NOT required in Phase 0
```

**Not** a new top-level product repo.  
**Not** a new database for product data.  
**Not** a move of `app/argus` or trading routes.  
**Not** the home of trade/evidence/locus bytes.

### Host model

```text
┌──────────────────────────────────────────────────────────┐
│  MatrixTrade repository (single Next.js host)            │
│                                                          │
│   / … trading …     ← MTA product + MTA Store            │
│   /argus/*          ← ARGUS product + Argus Store        │
│   /forge/*          ← ArgusForge hub (Chaos + Registry)  │
│                                                          │
│   lib/argus/        ← ARGUS product code                 │
│   lib/mta/          ← optional future peel of trading    │
│                       logic into MTA Engine adapters     │
│   lib/argusforge/   ← Memory API + adapters (hub)        │
│                                                          │
│   md/argusforge/    ← umbrella architecture              │
└──────────────────────────────────────────────────────────┘
```

**Principle:** Products keep their data and routes. ArgusForge exposes the **Memory Registry API**. It never becomes the owner of ARGUS journal, MTA trades, or Alexandria loci.

---

## 2. How Chaos should integrate without affecting MatrixTrade

### Two meanings of “Chaos” (must stay explicit)

| Chaos (today) | Chaos (ArgusForge) |
|---------------|--------------------|
| Coordination channel for AIs (`tools/Chaos/`, public repo) | Low-friction **capture entry** — everything enters here first |
| STATUS, logs, decisions, handoffs | Creates a **Memory Entry** (identity); raw bytes go to Capture staging or a product store |
| Must keep working unchanged | New module; must not rewrite trading or ARGUS |

Until a deliberate merge plan exists, treat them as:

- **Chaos Coordination** — existing handoff system  
- **Chaos Capture** — ArgusForge entry module  

Phase 0 does **not** rename or relocate `tools/Chaos/`. Capture may later *link* to coordination logs via adapters; it must not break the “always push Chaos” ritual.

### Chaos does not decide ownership up front

Flow:

```text
Chaos
  → register Memory Entry (identity)
  → hold raw in Capture staging (if unowned) OR point at existing product object
  → later decide:
        belongs to ARGUS?
        belongs to MTA?
        remains capture-only?
        (Alexandria — later only; product FROZEN)
```

Promotion copies or writes **into the product store** (via existing Apply gates). The Registry updates the pointer / source. It does **not** become a second copy-of-record forever.

### Integration rules for Chaos Capture

1. **Capture first** — no type/entity/folder required at write time (same spirit as ARGUS design principle #1).
2. **Always register** a Memory Entry via the Memory API (identity + pointer).
3. **Do not treat Forge as the product store** — do not replace `data/trades.json`, `vault/Trades/` frontmatter, or `data/argus/journal.json`.
4. **Promotion is explicit** — adapters may *propose* placement into ARGUS or MTA; humans (or existing Apply gates) accept. **Alexandria promotion is out of scope** while FROZEN.
5. **UI island** — if/when UI exists, mount at `/forge/chaos` (or `/forge`) with its own layout; no changes to MTA preview shell or ARGUS v2 shell required.
6. **Phone-first** — capture path must work with the same friction constraints as mobile ARGUS/MTA (short form, append, done).

### Non-impact guarantee

| Existing path | Chaos Capture may… | Must not… |
|---------------|--------------------|-----------|
| MTA routes / inbox Apply | Register pointer `matrix://…`; propose Apply later | Alter trade Apply pipeline; shadow-store trades in Forge |
| ARGUS inbox / journal | Register pointer `argus://…`; propose links via Argus Engine | Bypass ARGUS immutability / ownership |
| Alexandria (frozen) | Acknowledge future exchange boundary only | Define packages/schemas/adapters/APIs; depend on Alexandria; block Forge on Alexandria |
| `middleware.ts` auth | Add `/forge` to an auth bucket when UI exists | Change MTA or ARGUS password semantics |
| Product DBs | — | Create a universal `forge_memory_blobs` product database |

---

## 3. How future engines should be isolated

### Product vs Engine vs Hub vs Registry

```text
PRODUCTS (UX + owned stores)     ENGINES (logic)        HUB + REGISTRY
────────────────────────────     ───────────────        ────────────────
ARGUS Store  ◄── ARGUS ──uses──► Argus Engine ──► ArgusForge
MTA Store    ◄── MTA   ──uses──► MTA Engine   ──► ArgusForge
Alexandria   ──── FROZEN external ──────────────► (future exchange boundary only)
Chaos staging (unowned raw only) ───────────────► Memory API
Vault outputs ◄──── read via Registry pointers + adapters
```

**Alexandria must not block ArgusForge. ArgusForge must not depend on Alexandria.**  
Contract: [`alexandria-frozen-contract.md`](alexandria-frozen-contract.md).
### Isolation rules

1. **Engines have no UI.** They are libraries behind contracts.
2. **Engines do not own persistence.** Products own stores. Memory Registry owns **identity records**, not product bytes.
3. **Engines are called through adapters** in `lib/argusforge/adapters/*` or product-local wrappers — never by importing deep ARGUS UI internals from MTA or vice versa.
4. **Extraction before sharing:**  
   - Argus Engine starts as *facades over existing* `lib/argus/*` relationship helpers — not a rewrite.  
   - MTA Engine starts as *facades over existing* recurrence / attention / metrics helpers already in trading `lib/` — not a new analytics product.
5. **No cross-product imports of page components.** Only contracts and DTO types.
6. **Calculated views are Registry views**, not engines and not folders: Focus / Active / Archive may *call* MTA Engine for scores and Argus Engine for placement hints, then filter registry entries.

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
```

### Phase 1+ (structure reserved — do not invent early)

```text
md/argusforge/
  contracts/
    chaos-capture.md
    memory-registry.md           ← identity + pointers (NOT storage)
    argus-engine.md
    mta-engine.md
    vault-output.md
    # alexandria — deferred; see alexandria-frozen-contract.md
  adapters/
    existing-systems-map.md      ← maps today’s files → URI schemes + contracts

lib/argusforge/
  contracts/                     ← TypeScript types mirroring md contracts
  memory/                        ← Memory API (registry only)
  adapters/
    argus/                       ← resolve argus:// → Argus Store
    mta/                         ← resolve matrix:// → MTA Store
    # alexandria/                ← FORBIDDEN until reopen study
    chaos-coordination/          ← optional bridge to tools/Chaos
  chaos/                         ← capture helpers + staging adapter (unowned raw)

app/forge/                       ← hub UI island (Chaos first)
  layout.tsx
  page.tsx                       ← hub home
  chaos/page.tsx                 ← capture
  memory/page.tsx                ← Registry views (Focus / Active / Archive)
```

### Explicit non-moves / non-owns

| Path / concern | Action |
|----------------|--------|
| `app/argus/**` | Stay |
| `lib/argus/**` | Stay; Argus Engine *adapts* |
| `app/(trading)/**` | Stay |
| Trading `lib/*` | Stay; MTA Engine *adapts* |
| `tools/Chaos/**` | Stay as Chaos Coordination until a separate ADR merges capture + coordination |
| `data/argus/**`, trades stores | Stay owned by products |
| Alexandria repository / product | **FROZEN** — preserve; do not modify or merge into Forge |
| Product bytes inside `lib/argusforge/memory` | **Forbidden** |

---

## 5. Suggested contracts

Contracts are **interfaces**, not tables. Prefer payloads that existing Apply / Inbox patterns already understand.

### 5.1 Chaos Capture

```text
ChaosCaptureEvent
  capturedAt
  rawText            ← immutable bytes (staging or immediate product write)
  source             ← phone | web | import | ai-handoff | …
  attachments[]?
  labels[]?          ← optional, never required
```

On capture, Chaos:

1. Persists raw only if needed in **Capture staging** (unowned), *or* writes into a product via Apply.  
2. Registers a **Memory Entry** with pointer to that location.  
3. Never sets Focus / Active / Archive (calculated later).

### 5.2 Memory Registry (canonical)

```text
MemoryEntry
  id                 ← common identity (Forge-wide)
  createdAt
  source             ← MTA | ARGUS | Alexandria | Chaos | …
  externalId?        ← id in the product store (e.g. ST-MSFT, journal id)
  pointer            ← URI: matrix://… | argus://… | alex://… | chaos://…
  context?           ← shared lightweight context (not a document body)
  links[]?           ← registry-level relations (optional; prefer Argus Engine for rich graphs)
  annotations[]?     ← overlays; never replace product truth
```

**URI schemes (illustrative — lock in a later ADR):**

| Scheme | Resolves via adapter to |
|--------|-------------------------|
| `matrix://` | MTA Store |
| `argus://` | Argus Store |
| `chaos://` | Capture staging (unowned raw) |
| `alex://` | **Reserved** — Alexandria FROZEN; no resolver until reopen study |

**Calculated states (views over Registry entries — not storage folders):**

| State | Meaning (initial — refine in later ADR) |
|-------|------------------------------------------|
| **Focus** | Deserves attention now (MTA Engine signals + recency + open loops) |
| **Active** | In play; linked or recently used; not closed |
| **Archive** | Still registered forever; not in Focus/Active; still resolvable |

Nothing is deleted from the Registry without an explicit ADR. “Archive” does not move product bytes.

**Stability property:** If MTA moves SQLite→Postgres, or Alexandria changes format, or ARGUS becomes another project, **Memory Entries keep working** as long as adapters still resolve pointers.

### 5.3 Argus Engine

```text
ArgusEngine
  resolveEntities(text|refs) → EntityHint[]
  suggestLinks(entry) → LinkSuggestion[]
  suggestPlacement(entry) → PlacementHint   ← which product / context
  group(entries) → GroupHint[]
```

Facades over existing `lib/argus/*`. ARGUS remains source of truth for evidence persistence.

### 5.4 MTA Engine

```text
MtaEngine
  measureUsage(subject) → UsageStats
  measureRecurrence(subject) → RecurrenceStats
  temporalPattern(subject) → TemporalStats
  listHypotheses(subject) → Hypothesis[]
  attentionScore(subject) → AttentionSignal   ← feeds Focus view
```

Facades over existing trading metrics / attention code. MTA remains source of truth for trades and experiment rules.

### 5.5 Vault (AI output)

```text
VaultExportRequest
  scope              ← registry view | entry ids | product slice via pointers
  audience           ← model / grant TTL / purpose
  format             ← md | json | sectioned-snapshot
```

Resolves pointers through adapters; assembles a temporary export. Does **not** become a second journal.

### 5.6 Alexandria (frozen — acknowledgment only)

Alexandria is a **frozen external product**. See [`alexandria-frozen-contract.md`](alexandria-frozen-contract.md).

ArgusForge may only acknowledge that Alexandria will **eventually** consume structured knowledge via a future **exchange boundary**.

**Do not** define now:

- Alexandria packages;
- schemas;
- adapters;
- APIs;
- Gatekeeper expansions;
- 3D engine choices.

**Vault** is the AI output interface for current Forge work. Human spatial product work waits for Alexandria reopen.

Gatekeeper is traversal only — not Alexandria-as-a-whole and not in Forge scope.

### 5.7 Hub orchestration (ArgusForge)

```text
Forge does:
  expose Chaos Capture
  expose Memory Registry API (identity + pointers)
  ask Argus Engine for placement/links (suggestions)
  ask MTA Engine for attention/recurrence (signals)
  expose Focus / Active / Archive as registry views
  later: feed Vault by resolving pointers

Forge does not:
  own trade numbers
  own ARGUS journal truth
  depend on Alexandria
  implement Alexandria adapters/packages while FROZEN
  become the universal blob store
  auto-apply into products without existing human gates
```
---

## 6. Migration strategy

**Nothing migrates in Phase 0.** Phase 0 seals the map — including the Memory Registry decision.

| Stage | Goal | Reuse | Forbidden |
|-------|------|-------|-----------|
| **0 — Map** | This document; index in `md/README.md` | Existing island pattern (ARGUS-in-host) | Code, new universal DB, new app |
| **1 — Chaos + Registry stub** | Capture staging (unowned) + Memory Entry registration; pointers only | Capture-first UX from ARGUS; phone habits from MTA | Copying product data into Forge; “Memory database” for trades/evidence |
| **2 — Adapters** | `matrix://`, `argus://` resolvers + Argus/MTA Engine facades | Existing stores and helpers | Moving folders; renaming products |
| **3 — Views** | Focus / Active / Archive as registry queries | MTA Engine attentionScore + recency | Physical archive folders; relocating bytes |
| **4 — Hub UI** | `/forge` island | Same nesting as `/argus` | Merging sidebars with ARGUS/MTA |
| **5 — Outputs** | Vault packages via pointer resolution | Scoped grants, sectioned snapshots | Alexandria integration; Forge-owned content lakes |
| **6 — Optional peel** | Extract helpers behind engine facades only under pain | Copy-on-write extraction | Big-bang shared storage rewrite |

### Adapter-first rule

```text
Existing product object  →  pointer (URI)  →  Memory Entry
Existing function        →  Adapter        →  Engine / resolver contract
```

If an adapter is hard to write, the contract is wrong — fix the contract, do not rewrite the product.

### Data strategy

- **Phase 0–1:** no new product database. Registry may be a thin append-only identity index (implementation choice deferred to Phase 1 ADR). Capture staging holds **only unowned raw** until promotion.
- **Later:** search indexes (e.g. Supabase/pgvector) may index **registry metadata + resolved snippets** — never replace product sources of truth.
- **Product store migrations** (SQLite→Postgres, etc.) update **adapters**, not Memory Entry semantics.

---

## 7. Risks

| Risk | Why it happens | Mitigation |
|------|----------------|------------|
| **Memory becomes a database** | Habit: “put it in Forge” | Locked naming: **Memory Registry**; forbid blob ownership in Forge |
| **Forge as data lake** | Convenience copies | Pointers only; promotion writes into product stores |
| **Name collision: Chaos** | Coordination repo vs capture module | Keep Coordination vs Capture explicit until an ADR merges them |
| **Forge becomes a third app** | UI enthusiasm | Hub only; no separate deploy |
| **Engine rewrite temptation** | “Clean” shared core | Facades only; forbid Intelligence/Core naming |
| **Silent coupling** | Importing `app/argus` components into forge | Contract + adapter lint/review |
| **Focus/Active/Archive as folders** | Notes-app habit | Always defined as registry views |
| **Auto-write into ARGUS/MTA** | Convenience | Reuse human Apply gates |
| **URI scheme drift** | Ad-hoc pointers | Lock schemes in Memory Registry ADR before Phase 2 |
| **Orphan staging forever** | Capture without promotion | Views + attention (MTA Engine) surface unowned Chaos entries |
| **Docs drift** | Code without map | Phase gate: cite contract (Registry vs Store vs Engine) |
| **Breaking existing islands** | Middleware edits | Additive route buckets only |

---

## 8. Phase 0 acceptance criteria

Phase 0 is done when:

1. This document is accepted as the umbrella map.
2. Names above are treated as locked — including **Memory Registry ≠ storage**.
3. No implementation PR starts without citing: product store vs registry entry vs engine vs view.
4. Next phase opens with ADRs for **Chaos Capture** and **Memory Registry** (pointers + URI schemes) — still adapter-first, still no product moves.

---

## 9. Immediate non-goals

- No `/forge` UI yet (unless a later phase explicitly opens it).
- No extraction of `lib/argus` into a package.
- No merge of Chaos Coordination into Capture.
- No Forge-owned universal content database.
- No Alexandria implementation, UI polish, adapters, or Forge merge (FROZEN).
- No RAZ/Vault egg that bypasses this map (Vault = output interface via Registry).
- No “Shared Engine” / “Intelligence” layer.

---

## Related existing truth (reuse anchors)

| Existing doc / pattern | Reuse as |
|------------------------|----------|
| ARGUS island in host (`/argus/*`) | Template for `/forge/*` nesting |
| Capture-first + AI annotates never rewrites | Chaos + Registry annotation rules |
| Trading inbox Apply gate | Promotion into MTA Store |
| Product-owned data (ARGUS / MTA) | Proof that Memory must not absorb stores |
| Scoped AI grants / sectioned snapshots | Vault output via resolved pointers |
| ARGUS deliver ladder | Possible future human packages — **not** Alexandria work now |
| [`alexandria-frozen-contract.md`](alexandria-frozen-contract.md) | Binding freeze for Alexandria / Gatekeeper |
| `tools/Chaos` STATUS/log ritual | Chaos Coordination (unchanged) |
| `md/` Library tiers | Home for `md/argusforge/` |

---

## Decision summary

**ArgusForge** = integration hub inside the existing MatrixTrade repository — not a database.  
**Chaos** = creates identities (and optional unowned staging); does not decide final ownership up front.  
**Memory Registry** = common identity + pointers + shared context; **never** product bytes.  
**Products** = sole owners of their stores (Argus / MTA / …).  
**Argus Engine** / **MTA Engine** = enrich identity (relations / quantification) via adapters.  
**Focus / Active / Archive** = calculated registry views.  
**Vault** = AI output interface via Registry pointers.  
**Alexandria** = **FROZEN** external 3D knowledge product — preserve; study later; no Forge dependency.  

Nothing existing stops working. Nothing moves. Contracts before code.  
**Rescue property:** product storage can change; the Registry stays stable.
