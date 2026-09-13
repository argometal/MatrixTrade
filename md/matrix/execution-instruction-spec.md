# ExecutionInstruction — canonical specification

**Status:** Canonical reference for every AI that authors `proposal.executionInstruction`  
**Audience:** ChatGPT · Cursor · scoped Scout agents · future agents  
**Related:** `md/matrix/execution-instruction-architecture-follow-up.md` · PR #132  
**Code:** `lib/scout-execution-instruction.ts`

---

## Purpose

Operational instruction for the human trader — **how to execute** this Scout Plan.

- Explanation layer only  
- **Not** a Plan Map card dump  
- **Not** a calculation source  
- **Never** parsed back into Matrix geometry (`layeredEntry` / entry / stop / target)

---

## When mandatory

| Apply type | Rule |
|------------|------|
| `scout-plan-create` | **Always required** |
| `decision-update` mutating `plannedEntry` / `stopPrice` / `targetPrice` / `layeredEntry` | **Required** |
| OA / verdict / notes / `executionReadiness` / window-only | Not required |

Matrix **rejects** incomplete actionable proposals at **schema Validate** (`validateProposalPayload`).  
**Apply Verify** confirms the string persisted.  
Plan Map **never** synthesizes a fallback sentence.

---

## Tone / writing style

Experienced portfolio manager / desk:

- Imperative  
- Concise  
- Broker-actionable  
- Free prose — **not** a rigid template  

---

## Structure (recommended order)

Omit any block whose facts are unavailable:

1. Entries (single or layered + size/alloc if known)  
2. Stop (common or per-layer)  
3. Risk / allocation budget (if known)  
4. Hold / primary target / scale-out if specified  
5. No-chase / miss / partial-fill behavior  
6. Invalidation / do-not-execute / special instructions  

---

## Required information (when present on plan)

- Planned entry **or** each layer price  
- Stop (as modeled)  
- Primary target when defined  

## Optional information

- Exact shares — **write them in `executionInstruction`** (AI-authored operational counts). Do **not** put `plannedQuantity` on `limits[]` in Apply JSON; Matrix derives persisted quantities.
- `allocationPercent` on each limit — structural distribution (must sum to 100%). Do not replace % with shares in JSON.
- Authorized / max planned risk $
- Partial-fill / add rules
- Scaling / hold rules
- OA or playbook constraints already on the plan
- Special operational notes  

---

## Wording domains

### Single entry

Exact entry, stop, target; risk if known; hold rule; no-chase if applicable.

### Layered entry

Sequence: first size/price → adds if reached → completion.  
Shared stop or per-layer stops as modeled.  
Unfilled layers remain inactive / unfilled.

Write share quantities in this sentence. Keep `allocationPercent` on `layeredEntry.limits` (structural). Never send `plannedQuantity` in the Apply JSON.

Example:

> Buy 1 share at $315. Buy 2 shares at $310. Buy 2 shares at $305.

### Allocation

State percent and meaning only if on the plan.

### Scaling

Only if already plan/playbook fact — never invent scale rules.

### Partial fills

Only if policy already defined on plan/playbook.

### Do not chase

When plan has `noChase` / miss policy: explicit do-not-chase / do-not-market-if-levels-missed.

### Stop / target

Use stored levels only.

### Invalidation

Only known thesis/setup rules. Never invent invalidation prices.

### Special instructions

From plan notes only when operational.

### Missing data policy

**Omit.** Never invent prices, shares, risk, allocations, or R.

---

## Forbidden content

- Invented prices, shares, risk, allocations, R  
- Parsing this string to mutate Matrix geometry  
- Card / timeline / badge summaries as the main content  
- Psychology fluff without operational content  
- Contradicting stored `layeredEntry` / stop / target  

---

## Valid examples

**Single**

> Buy 8 shares at exactly $310.00. Place the stop immediately at $294.00. Maximum planned risk is approximately $100. Hold until the primary target at $380. Do not chase above the planned entry. If price never reaches the planned entry, do not execute the trade.

**Layered**

> Buy 1 share at $315. Buy 2 shares at $310. Buy 2 shares at $305. Use the common stop at $294 for the full position. Hold until the primary target at $380. Any layer not reached remains unfilled. Do not chase.

---

## Invalid examples

- `Enter at 310 with stop at 294 and primary target at 380.` — thin template dump when richer ops facts exist  
- `Buy ~10 shares somewhere near 310` — invents size/price  
- Putting `plannedQuantity` on `limits[]` in Apply JSON — Matrix owns persisted quantities; shares belong in `executionInstruction`  
- Long thesis essay with no orders/stops  

---

## Apply shape

```json
{
  "type": "decision-update",
  "proposal": {
    "planId": "PLAN-007",
    "plannedEntry": 310,
    "stopPrice": 294,
    "targetPrice": 380,
    "executionInstruction": "Buy … (PM operational instruction)"
  }
}
```

---

*Canonical — do not reintroduce deterministic Plan Map sentence generators (see PR #125 reconciliation).*
