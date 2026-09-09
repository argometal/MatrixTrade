# MXT HISTORICAL LEARNING COMPLETION

## A-Iteration

User-defined rules are primary.
This Library MD is the source of A-Iteration Anchors for its scope.
A-Iteration Anchors preserve the user's exact words.
AI never rewrites or reinterprets them.
If conflict or ambiguity exists, AI must negotiate with the user.
Respect ontology. Do not invent.
Only present what canonically exists in the epistemology.
If the required epistemology does not exist, do not add it; stop and report it.
Never change a user-defined A-Iteration rule.
Preserve A-Iteration Anchors.
Preserve what works.
Change only what is necessary.
Do not fix what does not block.
Verify the result.


**Status:** Practical completion (POST-017) — not sealed governance  
**As-of:** 2026-09-03  
**OHLCV:** `yahoo_finance_chart_v8` · **1d**  
**Policy:** No fabricated T0 · Engine 016a equations reported alongside practical diagnoses · Missing T0 → lower confidence, **not** automatic practical INDETERMINATE · MAF proposals = pending human Accept only  

---

## 0. PLAN-003 — HUMAN RECONSTRUCTION (persisted here; not T0)

```text
KIND: HUMAN_RECONSTRUCTION
CASE: PLAN-003 / MSFT
NOT_T0: true
NOT_MARKET_FACT: true
```

User reconstruction:

1. Plan originally built around entry ~350.  
2. Price lifted off.  
3. Later returned approximately to ~360.  
4. MXT was not ready yet.  
5. Further entry/R optimization was sought.  
6. Ended waiting for a more demanding entry.  
7. Afterwards price no longer fell below ~370 and lifted.

**Verified market (separate):** post-WAIT (from 2026-07-12) never printed ≤360; min 377.39; target ≥450 on 2026-07-30. Pre-Plan June 25–29 did print 350–360. Persisted Plan only captures the late, strict 350 WAIT — not the full process evolution above.

Also: [`mxt-practical-test-plan-003-gap-ledger.md`](mxt-practical-test-plan-003-gap-ledger.md)

---

## 1. Case evaluation table

| Case | Decisión | Expected | Why | Happened (verified / persisted) | Practical primary | Conf | Prov |
|---|---|---|---|---|---|---|---|
| H001 AMZN | ENTER* | Rebound from support | Hist notes / review | Loss; Accepted MAF entry_quality | ENTRY_QUALITY | high | accepted_maf |
| H002 GOOGL | ENTER* | Structural rebound | Hist recon | Closed; hist attribution entry/zone | ENTRY_QUALITY | med | hist_recon |
| PLAN-001 TSLA | WAIT | Pullback to 348 | Above zone; wait trigger | **Entry 348 printed** (post); tgt 430 not; later low 297 through stop | OVER_OPTIMIZATION *(entry printed, no fill)* + secondary avoided-stop path | med | plan+yahoo_1d |
| PLAN-002 NFLX | ENTER | Layered limits @ 73 | Thesis at support | GO; **no linked trade**; path traded through entry/stop area | ENTER_NO_TRADE_LINK / EXECUTION | low | plan+yahoo |
| PLAN-003 MSFT | WAIT | Retest 350 only | Do not chase | Literal 350 never; tgt yes; **human recon: tightened entry** | **NON-ADAPTATION** (+ process over-opt / R chase) | med | plan+yahoo+human_recon |
| PLAN-005 SHOP | WAIT | Pullback to 136 | Do not chase | Gap-through: no 1d bar spans 136; lows to 111 | ENTRY_PASSED (gap) / NON-ADAPTATION | med | plan+yahoo_1d |
| PLAN-009 TSLA | WAIT | Entry 280 (Modified Kelly) | Preserve wait | 280 never; tgt 350 yes; closest 297 | ENTRY_NOT_REACHED + NON-ADAPTATION | med | plan+yahoo |
| PLAN-010 NFLX | WAIT | Entry 60 / 5.6R | Asymmetry | 60 never; tgt 88 not yet; closest ~70 | ENTRY_NOT_REACHED | low | plan+yahoo |
| PLAN-011 NFLX | WAIT | same as 010 | dup | LO duplicate_creation | EXCLUDED | high | LO |
| PLAN-012 NFLX | WAIT | same as 010 | dup | LO duplicate_creation | EXCLUDED | high | LO |
| PLAN-008 AMZN | WAIT | Entry 206 | 4.25R setup | 206 never; tgt 240 yes; closest 231 | ENTRY_NOT_REACHED | med | plan+yahoo+LO |
| PLAN-013 VGT | WAIT | Pullback 100 | Pivot buy | 100 never; tgt 126 not; closest 111 | ENTRY_NOT_REACHED | low | plan+yahoo |
| PLAN-004 NFLX | WAIT | Entry 70 | Historical window alive | 70 never; closest 75.5; tgt not | ENTRY_NOT_REACHED | low | plan+yahoo |
| PLAN-007 GOOGL | WAIT | Entry 310 (not 360) | Prior 360 inadequate RR | 310 never; closest 333; tgt not | ENTRY_NOT_REACHED + R_CONSTRAINT (stated) | med | plan+yahoo |

Engine 016a for all modern no-entry: `EQ-016A-NE-MISSING-T0` → engine class INDETERMINATE (expected without freeze). Practical layer above is what completion uses.

---

## 2. What worked / failed (per Case)

| Case | Worked | Failed |
|---|---|---|
| H001 | Outcome recorded; MAF accepted | Entry/location quality |
| H002 | Hist reconstruction present | No accepted MAF yet; entry/zone weakness |
| PLAN-001 | Avoided stop-side wipe after print (price →297) | Did not define participation rule when 348 printed |
| PLAN-002 | Clear GO intent + geometry | No trade linkage / execution evidence |
| PLAN-003 | Thesis direction eventually right (→450+) | Executable entry never adapted; process over-opt |
| PLAN-005 | Avoided chasing elevated prices at create | No revalidation when price gapped through zone |
| PLAN-009 | — | Wait held while target completed without entry |
| PLAN-010/4/13/7 | Asymmetry discipline (deep levels) | Levels may be unreachable; no adaptation trigger |
| PLAN-008 | — | Same pattern as 009/003: target without entry |
| PLAN-011/12 | Deduped | Noise creation |

---

## 3. Diagnosis + confidence / provenance

### Mapping to 013–017

| Practical finding | Formal 016a / MAF mapping |
|---|---|
| GOOD_FILTER (literal) | NE_GOOD_FILTER when T0+condition_not_met |
| OVER_OPTIMIZATION | NE_OVER_OPT when T0+condition_met |
| ENTRY_CONDITION_NOT_REACHED | Reality assist / LO `entry_not_reached` — causal finding |
| NON-ADAPTATION | **Not a formal 016a class** — causal finding / subcause (report as such) |
| ENTRY_QUALITY / TIMING | MAF components |
| R_CONSTRAINT | Often inside entry_quality / capital — causal note |
| EXCLUDED duplicate | LO `duplicate_creation` |
| Engine INDETERMINATE | EQ-016A-NE-MISSING-T0 — provenance penalty only |

### PLAN-003 checklist (requested)

| Lens | Finding |
|---|---|
| Thesis quality | Directionally supported by later path to 450+ *(not T0-verified)* |
| Entry condition | Persisted 350 never printed post-WAIT |
| Entry over-optimization | **Yes (process)** via human reconstruction — tightened after 360 opportunity |
| Timing | Late strict wait vs earlier 360 window |
| R constraint | Inferred chase for better R *(reconstructed)* |
| Adaptation/non-adaptation | **Primary:** no revised executable entry after structure change |
| Participation | No trade |

---

## 4. Aggregate causal distribution

**Universe:** 14 Cases · **Evaluable (practical):** 12 · **Excluded dups:** 2 · **Genuinely indeterminate (practical):** 0 hard-empty; **2 low-confidence open paths** (PLAN-010, PLAN-013 still unresolved vs target)

| Metric | Count | Notes |
|---|---|---|
| ENTER* / ENTER | 3 | H001, H002, PLAN-002 |
| WAIT | 11 (9 learning + 2 dup) | |
| PASS | 0 | |
| ENTER rate (excl dup) | 3/12 = **25%** | |
| WAIT rate (excl dup) | 9/12 = **75%** | |
| Good Filter (literal / candidate) | 4–5 | 008, 010, 004, 013, (005 partial) |
| Over-optimization (practical) | **2** | PLAN-001 (level printed); PLAN-003 process |
| Entry not reached | **7** | 003,005,008,009,010,004,007,013 |
| Timing failures | 3–4 | 003,001,009 secondary |
| R/R constraint | 2 | 007 stated; 003 inferred |
| Thesis failures | 0 clear | |
| Execution failures | 1 | PLAN-002 no trade link |
| Non-adaptation findings | **4+** | 003,005,008,009 |
| Accepted MAF | 1 | H001 |
| Engine INDETERMINATE (missing T0) | 12 modern | expected |

---

## 5. WHY IS MXT NOT PARTICIPATING?

Evidence-backed answer:

1. **Default posture is WAIT for deep asymmetric entries** (high R, “do not chase”) — 75% of evaluable Cases.  
2. **Those levels often never reprint** after decision (MSFT 350, AMZN 206, TSLA 280, NFLX 60/70, GOOGL 310, VGT 100).  
3. **When price structure improves without hitting the frozen limit, there is no captured revalidation / revised executable entry** → **non-adaptation** (clearest on MSFT with human reconstruction; visible on 008/009/005).  
4. **When an entry level does print (TSLA 348), there is still no participation rule / fill** → over-optimization risk.  
5. **One GO (PLAN-002) left no trade evidence** → even ENTER intent fails the loop.  
6. Historical ENTERs that did happen (H001/H002) show **entry/location quality** as drag — so participation without location discipline also loses.

**Central pattern:** MXT filters hard for asymmetry, then **does not update the executable condition** as the market proves a higher low / gap-through / completed target — so learning accumulates “missed_opportunity” and empty participation, not Case A/C.

---

## 6. Repeated primary drags

1. **Entry condition unreachable / not revalidated** (WAIT cohort)  
2. **Non-adaptation of executable entry** after structure change  
3. **Entry / location quality** on historical fills (H001, H002)  
4. **Process over-optimization / R chase** (PLAN-003 reconstruction; PLAN-007 text)  
5. **Execution linkage gap** (PLAN-002)

---

## 7. MAF proposals requiring human Accept

**Do not auto-Accept.** Drafts for review:

| Proposal ID | Case | Suggested primary drag | Status |
|---|---|---|---|
| MAF-PROP-MSFT-003 | PLAN-003 | `entry_quality` (+ timing; note non-adaptation in reasoning) | **PENDING HUMAN** |
| MAF-PROP-TSLA-001 | PLAN-001 | `timing_quality` / `entry_quality` (level printed, no fill) | **PENDING HUMAN** |
| MAF-PROP-TSLA-009 | PLAN-009 | `entry_quality` | **PENDING HUMAN** |
| MAF-PROP-AMZN-008 | PLAN-008 | `entry_quality` | **PENDING HUMAN** |
| MAF-PROP-SHOP-005 | PLAN-005 | `entry_quality` (gap-through / passed) | **PENDING HUMAN** |
| MAF-PROP-GOOGL-H002 | H002 | `entry_quality` (align hist recon) | **PENDING HUMAN** |

Canonical path: proposal → Validate → **HUMAN ACCEPT**.  
Draft payloads: [`data/maf-proposals-pending-post017.json`](../../data/maf-proposals-pending-post017.json)

*(Not written to `maf_experiments` while `MXT_READ_ONLY=1` / without Accept.)*

---

## 8. CREATE prompt gap ledger

Audited against: `stock-case-boot` / `stock-case-create`, `initialScout`, `decision-update`, Scout OA (`needs_reanalysis`, `replace_plan`, `entry_passed_without_execution`).

| Info needed for 013–017 | Classification | Notes |
|---|---|---|
| Hypothesis under test | CAPTURED BUT LOST / weak | Thesis text exists; not labeled as testable hypothesis id |
| Why ENTER/WAIT/PASS | ALREADY CAPTURED | `decision.reasoning` |
| Exact blocker to participation | NOT CAPTURED | No structured `participationBlocker` |
| Entry/R rationale | PARTIAL | plannedRR + prose; not “why this R vs accept worse R” |
| What would change the decision | NOT CAPTURED | No `invalidateWaitIf` / revision triggers |
| Evolution / revalidation | NOT CAPTURED as chronology | OA freshness/stale exists; no event log of entry revisions |
| Plan/Thesis/Playbook linkage | ALREADY CAPTURED fields | Often null playbook (PLAN-003) |
| Contemporaneous price at decide | NOT CAPTURED | No T0 freeze on these Cases |
| Pre-decision zone visits | DERIVABLE | Yahoo — not stored on create |
| Human process narrative | HISTORICAL-ONLY | PLAN-003 reconstruction |
| Duplicate scout prevention | ALREADY CAPTURED (late) | LO duplicate — after the fact |

---

## 9. Minimum capture fixes (propose only — no implementation)

1. **On Scout CREATE / decision-update:** require structured fields:  
   `hypothesisId` · `participationBlocker` · `entryRationale` · `reviseIf[]` (observable triggers).  
2. **On WAIT:** force `executableEntry` + `originalEntry` (immutable original ≠ live executable).  
3. **Revalidation event** when OA=`entry_passed` / `replace_plan` / higher-low — must link successor Plan or explicit `hold_original` reason.  
4. **T0 freeze on first committed decision** (already designed; these Cases predate readiness — enforce going forward).  
5. **CREATE prompt:** one line each for “what would make me enter tomorrow” and “what would cancel this wait”.

---

## 10. Cases still genuinely indeterminate

| Case | Why still weak |
|---|---|
| PLAN-010, PLAN-013, PLAN-004, PLAN-007 | Entry not reached; target not confirmed in window — open / low resolution |
| PLAN-002 | GO without trade — execution unknown |
| Engine view of all modern WAIT | Missing T0 → 016a INDETERMINATE (provenance), **not** used as practical stop |

None require STOP for ontology. None need T0 fabrication.

---

## FINAL

### Can existing Cases tell us what MXT is doing wrong?

**YES** (practical) / **PARTIAL** (formal 016a without T0)

### Top causes

1. Non-adaptation of executable entry after market proves higher structure  
2. Chronic WAIT for deep levels that do not return  
3. Entry/location quality when it does trade (historical)  
4. Missing participation/execution linkage on GO  

### What specifically should MXT change? (direction only)

1. Separate **immutable original WAIT** from **live executable entry**; require revalidation events.  
2. Accept a small MAF batch (above) to lock learning labels.  
3. Enforce T0 + blocker/reviseIf on **new** Cases only.  
4. Stop opening new audit threads — run **forward Cases** under the fixed capture.

---

## How to advance (break the no-progress bubble)

You are looping: inventory → evidence pack → verify Reality → gap ledger → another audit. That loop **does not create learning objects**.

**Next 3 moves only:**

1. **Human Accept 1–2 MAFs** (start PLAN-003 + H002 or PLAN-001) — converts this writeup into canonical attribution.  
2. **Ship the minimum CREATE capture** (blocker + reviseIf + original vs executable entry) — one small change, not a new ontology.  
3. **Open 1–2 forward Cases with T0** and run them to Reality — the authorized path after 017.

Do **not** start 018. Do **not** re-seal doctrine. Do **not** re-litigate historical T0 sufficiency.

**ARGUS INDEX: 0.85** — completion produced actionable accumulation; residual drag is Accept + capture, not more analysis.
