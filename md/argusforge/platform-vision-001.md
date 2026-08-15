# ARGUS FORGE · PLATFORM VISION 001

**Status:** Proposal — library only · **not sealed** · **no implementation**  
**Date:** 2026-08-10  
**Audience:** Agents and humans designing Forge home / platform growth  
**Rule:** Repository truth is authoritative. This document proposes a long-term home and control-plane direction. It must not be treated as shipped runtime. Prefer sealed contracts and IA runtime docs when they diverge on what exists today.

| Related (read first) | Role |
|----------------------|------|
| [`IA-HANDOFF.md`](IA-HANDOFF.md) | Living runtime: apps map, auth, Forge routes |
| [`capability-map.md`](capability-map.md) | Capability × status vocabulary |
| [`argusforge-contract.md`](argusforge-contract.md) | **SEALED** vision — formation transfer; AF coordinates |
| [`perpetual-evolution-contract.md`](perpetual-evolution-contract.md) | **SEALED** addendum — nothing in AF is final |
| [`phase-0-architecture.md`](phase-0-architecture.md) | Phase 0 technical map (closed) |
| [`alexandria-frozen-contract.md`](alexandria-frozen-contract.md) | Alexandria **repo** frozen |
| [`change-24-1e.md`](change-24-1e.md) | Current `/forge` = Home Explorer (shipped) |

**Objective for development branches:** Treat this document as the north star for any future Forge *workspace / home / launcher* work. Do not implement UI from this file until an explicit implementation prompt. Chaos, Explorer, Vault prep, and product apps continue under their existing contracts.

---

## 1. Current repository observations

Facts from the MatrixTrade repo (not invented):

### 1.1 Three product surfaces today

| Surface | Entry | Auth | Role in code |
|---------|-------|------|--------------|
| **MTA** (MatrixTrade) | `/home-preview` (root `/` redirects here) | `mt-auth` | Trading · Scout · Capital · Control Apply |
| **ARGUS** | `/argus/v2` | `argus-auth` | Evidence journal · Network · Runbooks · Intelligence |
| **ArgusForge** | `/forge` | same Argus session (`requireArgusSession`) | Local-first capture / Explorer / Chaos / Vault prep |

Chooser: `/apps` lists those three. Chrome switches: `AppExchangeActions` (per-app icons + `···` → `/apps`).

### 1.2 What `/forge` is today

Per CHANGE **24-1E** and `capability-map.md`, `/forge` is the **Knowledge Explorer** for ArgusForge’s own repository:

```text
Realm → Folder → Chaos Deck → Fragment → Block
```

Persistence: `localStorage` repo + IndexedDB assets. **Do not** mix Forge store logic with MTA trading tables or ARGUS journal Supabase tables (`IA-HANDOFF.md`).

Forge is **not** currently an ecosystem control plane. It is a coordination / capture shell whose home UI is an Explorer for Chaos material.

### 1.3 Adjacent surfaces that already resemble “platform”

- **`/apps`** — calm app chooser (name, short purpose, Open). Closest shipped ancestor of a Forge Workspace home.
- **`AppExchangeActions`** — multi-icon app switching in product chrome (plus inbox on MTA/ARGUS). Closest ancestor of a global launcher; today it hard-codes three apps.
- **`/forge/vault`** — Vault preparation queue (formation prep), not a standalone product app.
- **`/forge/library`** — AF repository browse / MTA library links.
- **Alexandria** — sealed as a **frozen external repository**; destination “Alexandria +1 under Argus” is contractual, not a live card in `/apps`.

### 1.4 Names present in sealed vision but not as equal apps

Sealed Phase 0 / contract language includes Chaos, Memory Registry, Argus Engine, MTA Engine, Vault, Alexandria. Runtime ships **products** (MTA, ARGUS, ArgusForge) and **Forge-internal** capabilities (Chaos, Explorer, Vault prep). **Praxis** is not an application route in this repository.

### 1.5 Canonical principle (already sealed — keep)

```text
Products own data.
Memory owns identity.
Argus relates.
MTA observes time.
Chaos captures.
Vault prepares formation.
ArgusForge coordinates.
```

PLATFORM VISION 001 extends *how* coordination may look as a quiet home — it does not replace this principle.

---

## 2. Forge long-term vision

Argus Forge should evolve from “one more application in `/apps`” into the **home and control plane** of a personal software ecosystem:

```text
Argus Forge (workspace / control plane)
  → specialized applications
  → shared platform capabilities
  → eventually autonomous / semi-autonomous agents
```

**Intent:**

- Human asks *where do I want to work?* and *what should I continue?*
- Forge routes intent into an application or (later) an agent.
- Execution and verification happen in the specialized system.
- Human approval remains required where products already require it (e.g. MTA Control → Apply).

**Non-goals for this vision:**

- Turning Forge Home into a SaaS metrics dashboard.
- Absorbing MTA or ARGUS data stores into a Forge database (forbidden by Phase 0 naming and ownership rules).
- Hard-coding today’s app list as the architecture.
- Replacing sealed formation-transfer mission with “app launcher only.”

Forge should feel quieter and simpler than the systems underneath it. Complexity expands **after** entering a system.

---

## 3. Proposed home-page information architecture

Conceptual **Forge Workspace** (not the current Knowledge Explorer). Primary question: **Where do I want to work?** Secondary: **What should I continue?**

```text
┌─ Header ─────────────────────────────────────────┐
│ ARGUS FORGE · one-line posture · status · [Apps] │
├─ Applications ───────────────────────────────────┤
│ Expandable grid of application cards + Future    │
├─ Continue ───────────────────────────────────────┤
│ Cross-ecosystem recent / active work (compact)   │
└──────────────────────────────────────────────────┘
```

| Region | Job | Must not become |
|--------|-----|-----------------|
| **Header** | Brand + calm status + global launcher affordance | Nav forest, metric strip |
| **Applications** | Choose a system to enter | App store, marketing carousel |
| **Continue** | Resume unfinished work across systems | Activity feed, social timeline, KPI board |

**Separation from Knowledge Explorer:** Realm / Deck / Fragment browsing remains an **in-Forge application surface** (today’s `/forge` Explorer), not the ecosystem home. When a Forge Workspace home is eventually introduced, Explorer should be entered like any other deep work surface — not dumped onto the first viewport.

---

## 4. Proposed visual hierarchy

First Forge home should be **simpler than a normal dashboard**:

```text
┌─────────────────────────────────────────────────────────────┐
│ ARGUS FORGE                                      ◉   [Apps] │
│ Your systems. One workspace.                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  APPLICATIONS                                               │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ (name)           │  │ (name)           │                 │
│  │ purpose          │  │ purpose          │                 │
│  │ status        →  │  │ status        →  │                 │
│  └──────────────────┘  └──────────────────┘                 │
│  … grid grows without redesign …                            │
│  ┌──────────────────┐                                       │
│  │       +          │                                       │
│  │ Future system    │                                       │
│  └──────────────────┘                                       │
│                                                             │
│  CONTINUE                                                   │
│  (system) · (short context)                    (recency) →  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Visual principles:**

- Brand-first: “ARGUS FORGE” is the hero signal; headlines must not overpower it.
- One composition in the first viewport: brand, short posture line, Applications, then Continue.
- No hero overlays, stat strips, pill clusters, or decorative complexity.
- Cards only because they are the interaction container for “Open system.”
- Grid accepts unknown future applications without a redesign.

---

## 5. Application-card model

Each card is a **registry entry**, not a hard-coded enum in the IA:

| Field | Meaning |
|-------|---------|
| **id** | Stable application id (string) |
| **name** | Display name |
| **purpose** | One short line |
| **status** | e.g. Active · Experimental · Frozen · Planned · Unavailable |
| **href / open action** | Entry route or external boundary |
| **optional activity** | Quiet context (last opened, pending count) — never a dashboard |
| **visibility** | Whether it appears on Home / launcher |

**Examples of how today’s systems would map (illustrative — not a locked list):**

| id | name | purpose | status note |
|----|------|---------|-------------|
| `mta` | MatrixTrade / MTA | Markets · Scout · Capital | Active product |
| `argus` | ARGUS | Intelligence · Evidence | Active product |
| `argusforge-capture` | (Forge / Chaos) | Capture · Explorer | Active — *Forge-internal* today; may later be “enter Capture” from Workspace |
| `vault` | Vault | Private formation prep | Capability under Forge today (`/forge/vault`), not a third auth product |
| `alexandria` | Alexandria | Knowledge motor | **Frozen repo** — card only if status communicates Frozen / destination, never fake Active |
| `praxis` | Praxis | Learning | **Not present** in repo — Planned / Future only if intentionally registered |

**Growth rule:** Adding an application means registering a card + entry route + auth boundary. It must not require redesigning Forge Home.

**Future system (+):** One conceptual slot for systems not yet conceived. It must not feel like an app store browse or marketplace.

---

## 6. Global launcher concept

**Problem today:** `AppExchangeActions` shows multiple product icons plus `···` → `/apps`. That scales poorly as the ecosystem grows and duplicates the chooser.

**Proposal:**

- One consistent **Forge Access** control across the ecosystem (icon / mark).
- Opens a **compact application/system selector** (overlay or slide-over) — same model as Home Applications, subset or full registry.
- Replaces *N* hard-coded peer icons over time; keep deep-links for current three during transition.
- `/apps` can remain the full-page chooser or converge into the Workspace home; do not invent a third parallel hub without retiring one.

Launcher answers: *Switch system without losing the “quiet layer” idea.*

---

## 7. Shared platform layer

Long-term organization (conceptual — not a mandate to build a Forge monolith DB):

| Layer | Responsibility | Repo alignment |
|-------|----------------|----------------|
| **Applications** | Specialized UI and workflows | MTA, ARGUS, Forge capture/Explorer, future apps |
| **Shared Services** | Identity, entities/tags, search, storage, files, notifications, permissions, APIs, shared UI primitives | Partially present (guest lock, tag ontology in ARGUS, Control Apply, chrome) — **not** unified yet |
| **Intelligence** | Shared context, retrieval, reasoning, cross-application knowledge | ARGUS Evidence Engine + MTA AI Blocks / snapshots; keep product ownership |
| **Agents** | Research, coding, maintenance, monitoring, workflow agents | Future — see §8 |

**Ownership constraint (reuse sealed rule):** Products own data. Shared services share *capabilities and contracts*, not a single “Forge Database” (forbidden name / anti-pattern in Phase 0).

**Intent flow:**

```text
Human intent
  → Forge (workspace / launcher)
  → application or agent
  → execution
  → verification
  → human approval where required
```

MTA already encodes human approval at Control → Apply. Any agent layer must respect that product boundary.

---

## 8. Future agent layer

Document only — no agent runtime in scope.

Agents would eventually:

- research across registered systems;
- propose coding or maintenance changes;
- monitor health / drift;
- prepare workflows for human confirmation.

**Guardrails:**

- Agents propose; humans (or product gates) accept.
- No silent mutation of trading capital, Scout/Trade ledgers, or ARGUS evidence without the product’s existing apply paths.
- Agent context should prefer Library docs + product snapshots over inventing ontology.

---

## 9. Growth strategy

1. **Registry over list** — applications are data (or a thin config module), not JSX hard-coded forever.
2. **Expect unknown apps** — Home grid and launcher must tolerate empty Planned slots and Frozen destinations.
3. **Split Workspace home from Capture Explorer** — do not grow ecosystem IA by stuffing app cards into Knowledge Explorer.
4. **Converge switchers** — evolve `/apps` + `AppExchangeActions` toward one Forge Access pattern instead of adding more icons.
5. **Respect freezes** — Alexandria repo stays frozen until reopen; do not fake integration cards.
6. **Evidence before complexity** — perpetual-evolution contract: improve only when it reduces friction or improves formation transfer.

---

## 10. What existing architecture should be reused

| Asset | Reuse how |
|-------|-----------|
| Sealed AF contracts + perpetual evolution | Mission and ownership; this vision is subordinate |
| `/apps` chooser | Prototype of Applications grid (calm cards) |
| `AppExchangeActions` | Seed of global launcher — refactor toward one control |
| `IA-HANDOFF` product map | Auth and entry truth while migrating |
| `capability-map.md` | Status vocabulary for cards (Active / Pending / Deprecated / Limited) |
| Forge Explorer (24-1E) | Keep as deep work inside Forge; do not delete for vision cosplay |
| Chaos + Vault prep | Remain Forge-internal capabilities under sealed duties |
| MTA Control Apply / ARGUS Evidence Engine | Proof that approval and intelligence stay *inside* products |
| Guest workstation lock / shared security settings | Early shared-service pattern (account-level policy) |

---

## 11. What ideas from the prompt should be rejected or modified (and why)

| Prompt idea | Verdict | Why |
|-------------|---------|-----|
| Hard-code Applications as Argus · MatrixTrade · Alexandria · Praxis · Vault | **Reject as architecture** | Repo has three live apps; Praxis absent; Vault is Forge capability; Alexandria frozen. Use a registry with honest status. |
| Make current `/forge` Explorer *become* the ecosystem dashboard in place | **Modify** | Explorer is valuable Chaos IA (24-1E). Ecosystem home should be a distinct Workspace surface (or evolved `/apps`), not Explorer with app cards bolted on. |
| Show Alexandria / Praxis as Active peers today | **Reject / soften** | Inventing Active cards contradicts freeze and missing routes. Planned or Frozen only. |
| Multiple app-switching icons forever | **Modify** | Replace gradually with one Forge Access control; keep transitional deep-links. |
| Shared platform = new central Forge database | **Reject** | Phase 0 forbids Forge Database / Memory Database naming and product-data absorption. |
| Agents with auto-apply on trading or evidence | **Reject** | Conflicts with Control → Apply and human-agency rules. |
| Forge Home as dense “Continue + metrics + graphs” | **Reject** | Violates quiet-layer principle and user design rules for first viewport. |
| Treat this MD as sealed or as implementation ticket | **Reject** | Proposal only; sealed contracts still prevail; no code from this file alone. |

---

## 12. Recommended phased evolution

**Phase A — Library (this document)**  
Publish vision; point agents here. No UI change.

**Phase B — IA alignment (docs / small contracts only)**  
Clarify naming: *Forge Workspace* vs *Knowledge Explorer* vs *Capture*. Decide whether Workspace replaces `/apps` or sits above it. Still no obligatory UI.

**Phase C — Registry stub (when implementation is authorized)**  
Thin application registry (config or module) feeding `/apps` first. Honest statuses. No dashboard chrome.

**Phase D — Global Forge Access**  
Single launcher control; deprecate multi-icon exchange gradually.

**Phase E — Forge Workspace home**  
Quiet Applications + Continue. Move or deep-link Explorer under Forge as an entered system. Continue strip uses real recent signals only when product APIs exist — no fake activity.

**Phase F — Shared services & intelligence contracts**  
Cross-app identity/search/tags only via explicit contracts; products keep stores.

**Phase G — Agents**  
Research/proposal agents behind human gates.

Each phase needs its own implementation prompt. **PLATFORM VISION 001 authorizes none of C–G by itself.**

---

## Agent checklist (for other branches)

When developing Forge-related UI or platform work:

1. Read this file + `IA-HANDOFF.md` + sealed `argusforge-contract.md`.
2. Ask: does this change make Forge quieter as a control plane, or noisier as another app?
3. Do not hard-code a fixed app pantheon; prefer registry / capability status.
4. Do not break product data ownership or Apply/evidence gates.
5. Do not implement Workspace home unless the task explicitly says to implement.
6. If repo truth conflicts with this proposal, **code and sealed contracts win** — update this proposal rather than inventing facts.

---

## Document control

| Field | Value |
|-------|--------|
| Id | `PLATFORM-VISION-001` |
| Path | `md/argusforge/platform-vision-001.md` |
| Implementation | **None** |
| Supersedes | Nothing sealed; complements Explorer (24-1E) as *future* Workspace direction |
| Next | Explicit implementation brief before any home/launcher code |
