# MTA · ExecutionInstruction architecture follow-up (post #132)

**Fecha:** 2026-07-31  
**Mode:** architecture decisions — **no code implementation in this doc’s authorization**  
**Baseline:** PR #132 — `executionInstruction` = Plan Map sentence  
**Related:** PR #125 (deterministic execution description) · handoff entrega `#132`  
**Branch tip for #132:** `cursor/plan-map-ai-execution-sentence-b0a5`

---

## Veredicto

1. **`executionInstruction` must be mandatory** for actionable Scout geometry — gate in **schema Validate**, confirm in **Apply Verify**; never UI fallback.  
2. **One ScoutPlan aggregate → many UI projections** (ontology below).  
3. **Formal spec did not exist** — canonical draft is §3 (promote to `execution-instruction-spec.md` when implementing).  
4. **PR #125:** do not merge as Plan Map sentence source; evolve or close into integrity/assistant only.

---

## 1. Mandatory `executionInstruction` — validation location

### Decision

| Layer | Role |
|-------|------|
| **Schema validate (`lib/bridge.ts` → `validateProposalPayload`)** | **Primary hard gate** — reject before Accept |
| **Apply Verify (`lib/apply-verify.ts`)** | **Secondary** — confirm string persisted after Accept |
| **Plan Map** | Projection only — never synthesize |
| **Mechanics / AI brief** | Author guidance — not a hard gate |

### When required

- **`scout-plan-create`** → always (creates geometry)  
- **`decision-update`** that mutates execution geometry → required:  
  `plannedEntry` · `stopPrice` · `targetPrice` · `layeredEntry` (incl. allocation/sizing inside)  
- Pure OA / verdict / notes / `executionReadiness` / window-only → **not** required (unless policy widened later)

Reject example:  
`executionInstruction required when execution geometry is present or changed`.

### Why not Verify-only

Incomplete JSON would Accept then fail after write — false confidence. Same pattern as hard-required Scout contract fields on create.

### Why not Plan Map fallback

Contradicts #132: wording is AI-authored; Matrix must not template-generate the sentence.

---

## 2. Scout ontology — one domain, many projections

### Problem

Overlapping “state” axes: `PlanStatus` · `DecisionVerdict` · OA · `executionReadiness` · lifecycle · Playbook rollup · fill label vocabularies · Probe vs LayeredEntry.

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

### Projection map (no UI redesign)

| Surface | Reads |
|---------|--------|
| **Plan Map** | Geometry + `executionInstruction` (+ fill projection) |
| **Needs Attention** | `PlanStatus` / window / outcome (OA optional later — today ATTN ≠ OA) |
| **Dashboard monitoring** | OA + `executionReadiness` |
| **Planning detail** | Full aggregate |
| **Future ops views** | Same aggregate, different slices |

### Naming

- Persist: `executionInstruction`  
- View `operationalParagraph` = alias of that field (rename later optional)  
- Probe = legacy; LayeredEntry = primary entry experiment  
- No new tables required for this decision  

---

## 3. `executionInstruction` specification (canonical draft)

**Prior art:** handoff + Mechanics one-liner only — **no formal spec**.  
This section is the canonical reference for every AI that authors the field.  
On implement: extract to `md/matrix/execution-instruction-spec.md` + Mechanics pointer.

### Purpose

Operational instruction for the human trader — **how to execute** this Scout.  
Not a Plan Map card dump. Not a calculation source. Never parsed back into geometry.

### When mandatory

See §1. Apply rejects actionable proposals that omit it (schema gate).

### Tone

Experienced portfolio manager / desk: imperative, concise, broker-actionable.

### Structure (recommended order; omit missing blocks)

1. Entries (single or layered + size/alloc if known)  
2. Stop (common or per-layer)  
3. Risk budget (if known)  
4. Hold / primary target / scale-out if specified  
5. No-chase / miss behavior  
6. Invalidation / do-not-execute conditions  

Free prose — **not** a rigid template.

### Required (when present on plan)

- Planned entry **or** each layer price  
- Stop (as modeled)  
- Primary target when defined  

### Optional

Exact shares (only if derived/supplied) · allocation % + meaning · authorized risk $ · partial-fill/add rules · scaling/hold · OA/playbook constraints · operational notes  

### Layered

Sequence: first → adds if reached → completion; shared or per-layer stop; unfilled layers stay inactive.

### Single

Exact entry, stop, target; risk if known; hold; no-chase if applicable.

### Scaling / partial fills / no-chase / invalidation

Only if already plan/playbook fact. Never invent sizes, prices, or invalidation levels.  
`noChase` / miss policy → explicit do-not-chase / do-not-market-if-missed.

### Prohibited

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

### What #125 is

Deterministic projection of structured geometry → Plan Map sentence. Rejects persisted free-text. Same UI slot as #132.

### Under #132

**Conflicts.** Plan Map wording is AI-authored; Matrix must not template-generate that sentence.

### Recommendation

| Option | Verdict |
|--------|---------|
| Merge #125 as-is | **Reject** |
| Keep #125 as Plan Map source | **Reject** |
| Close / supersede for Plan Map claim | **Preferred** |
| Evolve #125 | **Yes — ExecutionInstruction assistant / integrity only** |

### If anything is salvaged from #125

1. **Fact checklist / context pack** for AI (layers, stop, target, risk, no-chase) — labeled facts, not the instruction  
2. **Integrity flags** (warnings only): layered claim vs &lt;2 layers; shares mentioned but unavailable — **never auto-rewrite** the sentence  
3. **Repair JSON** for structured geometry (e.g. PLAN-007) — geometry Apply, not description sync  
4. Snapshots: drop deterministic `=== EXECUTION DESCRIPTION ===`; use current `executionInstruction` + this spec  

**No-overlap rule:** geometry → Matrix · wording → `executionInstruction` · #125-style code may audit, never write Plan Map prose.

---

## Implementation order (when authorized)

1. Confirm / merge #132  
2. Promote §3 → `md/matrix/execution-instruction-spec.md` + Mechanics pointer  
3. Schema-require `executionInstruction` on create + geometry-mutating `decision-update`  
4. Verify persistence of the field  
5. Close or rewrite #125 per §4  
6. Optional: ontology naming doc (ScoutPlan aggregate + projection map) — still no UI redesign  

---

## Related docs

- Entrega #132: `md/matrix/plan-map-ai-execution-sentence-handoff.md`  
- PR: https://github.com/argometal/MatrixTrade/pull/132  
- PR #125: https://github.com/argometal/MatrixTrade/pull/125  

---

*Architecture handoff — analysis only until implementation is explicitly authorized.*
