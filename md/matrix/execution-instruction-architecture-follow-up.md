# MTA · ExecutionInstruction architecture follow-up (post #132)

**Fecha:** 2026-07-31  
**Mode:** architecture + implementation on branch #132  
**Baseline:** PR #132 — `executionInstruction` = Plan Map sentence  
**Related:** PR #125 · entrega `#132` · `CHAT-HANDOFF.md`  
**Branch:** `cursor/plan-map-ai-execution-sentence-b0a5`  
**Implementation status:** mandatory gate + spec + ontology **landed on branch** (see `md/matrix/execution-instruction-implement-diff.md`)  
**Spec canónica:** `md/matrix/execution-instruction-spec.md`  
**Ontología:** `md/matrix/scout-ontology-scoutplan.md`

**Sources reviewed:** PR #132 · PR #125 · `CHAT-HANDOFF.md` · `md/matrix/execution-instruction-spec.md` · repo prompts/snapshots/docs

---

## Veredicto

1. **`executionInstruction` mandatory** for actionable Scout geometry — gate in **schema Validate**, confirm in **Apply Verify**; never UI fallback; never deterministic sentence generation.  
2. **One ScoutPlan aggregate → many UI projections.**  
3. **Formal spec:** **landed** — `md/matrix/execution-instruction-spec.md`.  
4. **PR #125:** do not merge as Plan Map sentence source; evolve→guidance/integrity or close.  
5. **Mandatory gate:** **landed on branch** — schema Validate + Apply Verify.  

---

## 1. Architecture assessment

### Current state

| Item | State |
|------|--------|
| Plan Map sentence source | #132 — AI `executionInstruction` only |
| Mandatory gate | **Not implemented** — field still optional |
| Formal spec | Draft here (§3) — not standalone canonical file |
| Ontology | Conceptual proposal — not adopted as milestone contract |
| PR #125 | Open draft — deterministic description — **conflicts** with #132 |

### §1 — Where Matrix rejects incomplete actionable plans

**Recommendation only (confirmed):**

| Layer | Verdict |
|-------|---------|
| **Proposal / schema validation** (`lib/bridge.ts` → `validateProposalPayload`) | **PRIMARY hard gate** |
| **Apply Verify** (`lib/apply-verify.ts`) | **SECONDARY** — persistence round-trip |
| Apply accept path | After validate; must not soft-accept missing instruction |
| Persistence | Stores AI text; does not invent it |
| Plan Map / UI | Projection only — **no deterministic fallback** |

**Actionable =** geometry present or mutated:

- `scout-plan-create` → `executionInstruction` **required**
- `decision-update` touching `plannedEntry` / `stopPrice` / `targetPrice` / `layeredEntry` → **required**
- OA / verdict / notes / readiness / window-only → **not** required

Reject before Accept, e.g.  
`executionInstruction required when execution geometry is present or changed`.

Instruction still originates **only** from the AI proposal.

“Plan Map never without instructions” = do **not accept** incomplete actionable plans — not generate UI text.

**Why not Verify-only:** Accept-then-fail → false confidence.  
**Why not Plan Map fallback:** contradicts #132.

---

## 2. Scout ontology — one domain, many projections

### Problem

Overlapping axes: `PlanStatus` · `DecisionVerdict` · OA · `executionReadiness` · lifecycle · Playbook rollup · fill label vocabularies · Probe vs LayeredEntry.

### Canonical aggregate: `ScoutPlan` (= today’s `TradePlan`)

```text
ScoutPlan
├── Identity: id, ticker, stockFileId, playbookId(s), window
├── Thesis link: Stock File (strategic) ≠ Scout (tactical)
├── Geometry (structured — Matrix-owned math)
│     entry | layeredEntry | stop | target | authorizedRisk | sizingMode
├── Decision (judgment snapshot)
│     verdict, confidence, challenges, reasoning, Family B / probe if any
├── OperationalAssessment (confirmed OA — monitoring / review)
├── ExecutionReadiness (arming — ≠ broker submit)
├── ExecutionInstruction (AI explanation — Plan Map sentence)
└── Outcome / Learning (terminal — plan-outcome, LO/OBS)
```

### Projection map (no UI / persistence redesign)

| Surface | Domain slice |
|---------|----------------|
| Scout / Planning | Full aggregate |
| Plan Map | Geometry + `executionInstruction` (+ fills) |
| Needs Attention | Status / window / outcome (OA not primary today) |
| Dashboard monitoring | OA + readiness |
| Learning | Outcome → LO / OBS / MAF |
| Trade transition | Geometry + readiness + human execute — Scout ≠ Trade until fill |
| Future ops views | Same aggregate, different slices |

### Duplicated / overlapping

PlanStatus · Verdict · OA · Readiness · Lifecycle · PlaybookScoutStatus · fill vocab (Plan Map vs MAF vs `limit.filled`) · Probe vs LayeredEntry · `operationalParagraph` (view) vs `executionInstruction` (persist).

### Missing as first-class

- Formal invariant: actionable geometry ⇒ instruction required  
- Single fill-status enum  
- Explicit Trade-transition readiness contract separate from OA  

### Belongs elsewhere

Capital / EP · MAF attribution · Stock File thesis (strategic).

### Naming

- Persist: `executionInstruction`  
- View `operationalParagraph` = alias (rename later optional)  
- Probe = legacy; LayeredEntry = primary entry experiment  
- No new tables for this decision  

---

## 3. `executionInstruction` specification (canonical draft)

**Search result:** no standalone canonical spec. Fragments only — entrega handoff, Mechanics one-liner, `lib/scout-execution-instruction.ts` guidance, AI block samples.

**Completeness:** insufficient for all AI systems (ChatGPT, Cursor, future agents).

**On implement:** promote to `md/matrix/execution-instruction-spec.md` + Mechanics + snapshot pointers.

### Purpose

Operational instruction for the human trader — **how to execute** this Scout.  
Not a Plan Map card dump. Not a calculation source. Never parsed back into geometry.

### When mandatory

See §1. Apply rejects actionable proposals that omit it (schema gate).

### Tone / writing style

Experienced portfolio manager / desk: imperative, concise, broker-actionable. Free prose — **not** a rigid template.

### Structure (recommended order; omit missing blocks)

1. Entries (single or layered + size/alloc if known)  
2. Stop (common or per-layer)  
3. Risk / allocation budget (if known)  
4. Hold / primary target / scale-out if specified  
5. No-chase / miss / partial-fill behavior  
6. Invalidation / do-not-execute / special instructions  

### Required (when present on plan)

- Planned entry **or** each layer price  
- Stop (as modeled)  
- Primary target when defined  

### Optional

Exact shares (only if derived/supplied) · allocation % + meaning · authorized risk $ · partial-fill/add rules · scaling/hold · OA/playbook constraints · special operational notes  

### Wording domains

| Topic | Rule |
|-------|------|
| Single entry | Exact entry, stop, target; risk if known; hold; no-chase if applicable |
| Layered | Sequence first → adds if reached → completion; shared or per-layer stop; unfilled stay inactive |
| Allocation | State % and meaning (risk vs position) only if on plan |
| Scaling | Only if plan/playbook fact — never invent |
| Partial fills | Policy only if already defined |
| Do not chase | When `noChase` / miss policy — explicit |
| Stop / target | Use stored levels only |
| Invalidation | Only known thesis/setup rules — never invent prices |
| Special instructions | From plan notes only if operational |
| Missing data | **Omit** — never invent |

### Prohibited / forbidden

- Invented prices, shares, risk, allocations, R  
- Parsing text → Matrix geometry  
- Card/timeline summaries as main content  
- Psychology fluff without ops content  
- Contradicting stored layeredEntry / stop / target  

### Valid examples

**Single**

> Buy 8 shares at exactly $310.00. Place the stop immediately at $294.00. Maximum planned risk is approximately $100. Hold until the primary target at $380. Do not chase above the planned entry. If price never reaches the planned entry, do not execute the trade.

**Layered**

> Buy the first 30% at $310. Add 40% at $305 if reached and complete the position at $300. Use the common stop at $294 for the full position. Hold until the primary target unless the thesis changes. Any layer not reached remains unfilled. Do not chase.

### Invalid examples

- Thin template-only dump when richer ops facts exist on the plan  
- `Buy ~10 shares somewhere near 310` — invents size/price  
- Hardcoded share ladder when quantities were never calculated  
- Long thesis essay with no orders/stops  

---

## 4. PR #125 reconciliation

### Hypothesis: **confirmed**

| Owner | Responsibility |
|-------|----------------|
| **#132** | Persist · Apply · Plan Map render · `executionInstruction` storage |
| **#125 evolved** | Generation **guidance** + integrity **warnings** only |
| **#125 as-is** | Deterministic Plan Map sentence → **deprecate / do not merge** |

### Recommendation

| Option | Verdict |
|--------|---------|
| Merge #125 as-is | **Reject** |
| Keep #125 as Plan Map source | **Reject** |
| Close / supersede for Plan Map claim | **Preferred** |
| Evolve #125 | **Yes — ExecutionInstruction assistant / integrity only** |

### Salvage (if any)

1. Fact checklist / context pack for AI — facts, not the instruction  
2. Integrity flags (warnings only) — never auto-rewrite the sentence  
3. Repair JSON for structured geometry — not description sync  
4. Snapshots: drop deterministic `=== EXECUTION DESCRIPTION ===`  

**No-overlap:** geometry → Matrix · wording → `executionInstruction` · ex-#125 may audit, never write Plan Map prose.

---

## 5. CHAT-HANDOFF — proposed additions (A–E)

Already partial (Pending #132 + architecture pointer). **Tighten:**

| | Addition |
|--|----------|
| **A** | Keep Pending #132 until merge+prod; tip SHA = current branch tip |
| **B** | Explicit rule: *actionable Scout ⇒ `executionInstruction` required; reject at schema Validate; Verify confirms persist; no UI fallback* — mark **pending implement** |
| **C** | Milestone: *Scout Ontology — ScoutPlan aggregate / projection map* (doc-only first) |
| **D** | *ExecutionInstruction Spec: draft in this file; canonical `execution-instruction-spec.md` not yet promoted* |
| **E** | *#125 open — reconcile before merge; must not restore deterministic Plan Map sentence; evolve→guidance or close* |

---

## 6. Conflicts discovered

1. **#125 vs #132** — same UI slot; opposite sentence ownership.  
2. **#132 optional field vs mandatory decision** — policy not enforced in code.  
3. **Legacy plans** — Plan Map can show no sentence until backfill; gate does not auto-heal history.  
4. **Naming drift** — `operationalParagraph` vs `executionInstruction`.  
5. **ATTN vs monitoring** — different readiness concepts; ontology not unified in live handoff.  
6. **CHAT-HANDOFF tip SHA** can lag branch tip.  
7. **Apply→Verify unify (#131 if open)** — secondary Verify gate must run on Control Accept path.

---

## 7. Recommended implementation order

1. Accept this architecture review.  
2. **Merge #132** (storage + AI render path).  
3. Promote §3 → `execution-instruction-spec.md` + Mechanics/snapshot pointers.  
4. **Close or rewrite #125** (no deterministic Plan Map path).  
5. Schema mandatory gate + Verify persistence check.  
6. CHAT-HANDOFF updates (A–E).  
7. Ontology milestone doc (ScoutPlan projection map) — no UI/persistence redesign.  
8. Legacy backfill policy (ATTN / repair Apply with AI instruction) — separate task.

Do **not** implement mandatory rejection before #132 merge + #125 reconciliation decision.

---

## 8. Risk analysis

| Risk | Severity | Mitigation |
|------|----------|------------|
| Merge #125 after #132 | High | Close/rewrite first |
| Mandatory gate without migration | Medium | Gate new/mutated geometry only; ATTN for legacy empty |
| Verify-only enforcement | High | Primary = Validate |
| Spec only in follow-up / chat | Medium | Promote standalone MD before multi-agent use |
| Ontology rename too early | Medium | Conceptual doc first; code rename later |
| AI invents numbers under mandatory pressure | High | Spec forbidden list + integrity warnings (ex-#125) |

---

## 9. Implementation plan (after acceptance only)

| Step | Work | Out of scope |
|------|------|----------------|
| 1 | Docs: promote spec; CHAT-HANDOFF A–E; mark #125 superseded/evolved | Code gates |
| 2 | `bridge.ts` / create-validate: require instruction on create + geometry mutation | UI redesign |
| 3 | `apply-verify.ts`: assert persisted string matches proposal | Deterministic formatter |
| 4 | Tests: reject incomplete actionable JSON; accept OA-only without instruction | Persistence schema redesign |
| 5 | Optional: integrity helper (ex-#125) as warnings | Plan Map sentence generation |
| 6 | Ontology MD milestone | Table migrations / UI rebuild |

---

## Related docs

- Entrega #132: `md/matrix/execution-instruction-spec.md`  
- PR #132: https://github.com/argometal/MatrixTrade/pull/132  
- PR #125: https://github.com/argometal/MatrixTrade/pull/125  

---

*Architecture handoff — analysis only until implementation is explicitly authorized.*
