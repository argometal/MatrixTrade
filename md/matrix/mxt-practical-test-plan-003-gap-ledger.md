# MXT Practical Test — PLAN-003 / MSFT Gap Ledger

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


**Status:** Evidence ledger (practical test) — not sealed governance  
**Case:** PLAN-003 · MSFT · Decision WAIT 2026-07-12T09:11:10.139Z  
**As-of:** 2026-09-03  
**Market source:** `yahoo_finance_chart_v8` · timeframe **1d** · regular session  
**Constraint:** Original T0 / original decision MUST remain immutable. This ledger does **not** authorize rewriting T0, decision.reasoning, or ex-ante geometry.

---

## 1. User recollection vs verified market + Plan chronology

User recollection is **not** treated as market fact. Verdicts below are vs Yahoo 1d + persisted PLAN-003 records only.

| User claim | Verified? | Evidence |
|---|---|---|
| Price offered opportunities around **350** and **360** | **CONFIRMED historically — but pre-Plan** | Daily band 350–360: **2026-06-25** (L 349.20), **2026-06-26** (L 355.43), **2026-06-29** (L 359.90). Touch 350: only **2026-06-25**. |
| Those offers occurred while PLAN-003 was waiting | **NOT CONFIRMED** | PLAN-003 / decision created **2026-07-12**. Post-decision: **zero** days with low≤360 or touch of 350. |
| System kept optimizing entry too late | **NOT CONFIRMED as stated** | `decisionHistory=[]`; `plannedEntry` remained **350** until outcome. No recorded entry revisions. Later OA (2026-08-03) = `missed` / `replace_plan` / `entry_passed_without_execution` — a **pass/replace signal**, not a trail of tighter entry optimizations. |
| Price no longer fell below ~**374**, then moved higher | **CONFIRMED (post-decision)** | After 2026-07-12: **no** daily low &lt; 374. Window min = **377.39** on **2026-07-23**; first high ≥450 on **2026-07-30**. |

### Chronology (persisted)

| When | Event | Market context (1d, last session on/before) |
|---|---|---|
| 2026-06-25…29 | *(no PLAN-003 yet)* | 350–360 band printed |
| 2026-07-10 | Last session before create | L 381.50 / H 391.91 / C 385.10 |
| 2026-07-12 07:06 | ST-MSFT-001 created · zone 350–355 | Weekend; prior session ~385 |
| 2026-07-12 09:11 | PLAN-003 created · WAIT @ 350 · validUntil 2026-10-12 | Same |
| 2026-07-13…23 | WAIT held | Post-decision lows ≥377.39; never ≤360 |
| 2026-07-30 | Target 450 first reached (daily) | H 458.69 |
| 2026-08-03 | OA confirmed: missed / replace_plan | After target already printed |
| 2026-08-15 | OBS + missed_opportunity LO | Manual OBS; plannedEntry still 350 |

**T0 freeze:** missing (unchanged). Contemporaneous plan/decision/thesis records survive outside freeze — see prior evidence pack. **Do not backfill a freeze from this ledger.**

---

## 2. Second hypothesis (evaluate; do not Case-classify)

> The initial entry condition may have been reasonable when created, but became stale/over-optimized because MXT failed to adapt the **executable** entry condition as market structure evolved.  
> Original decision / T0 remains frozen; adaptation would be a **later Plan revision**, not a rewrite of the original WAIT.

| Element | Status | Notes |
|---|---|---|
| “Reasonable when created” | **PARTIAL** | At create time, last session was already ~**381–392** (~9% above 350). The 350/360 prints were **~17 days earlier**. Thesis text already said not to chase near ~385. So 350 was a **deep-retest wait**, not an active offer at create time. |
| Market structure evolved (higher low) | **SUPPORTED (1d)** | Post-decision higher low **377.39** then impulse through **450** without revisiting 350–360. |
| Executable entry stayed fixed | **SUPPORTED** | `plannedEntry=350` never revised; empty `decisionHistory`. |
| MXT “failed to adapt” | **SUPPORTED as process gap** | OA eventually said `replace_plan` / `entry_passed_without_execution`, but **no** successor Plan with revised executable entry is linked; outcome closed as `missed_opportunity` with entry never reached. |
| Formal Case label over-optimized / good filter | **NOT ASSIGNED** | Still blocked for sealed equations by missing T0 + manual OBS limits; this hypothesis is **testable**, not concluded. |

**Practical distinction**

```text
IMMUTABLE ORIGINAL (must not mutate)
  WAIT @ 350 / stop 334 / target 450 / do-not-chase
  = ex-ante decision record (+ T0 freeze when present)

LATER ADAPTATION (separate object / new decision — not implemented here)
  Revised executable entry / zone / invalidation after structure change
  = new Plan revision or superseding Scout — must not rewrite original T0
```

---

## 3. Gap ledger — Plan / Scout capture

Inspection of PLAN-003 + Scout operational model (`lib/scout-operational-state.ts`, plan fields). Gaps are product/evidence gaps for learning — **not** implementation orders.

| ID | Gap | What exists today | What PLAN-003 showed | Learning impact |
|---|---|---|---|---|
| G1 | **Condition validity / revalidation over time** | `validFrom` / `validUntil`; OA `freshness` (`stale`); states `stale`, `needs_reanalysis`, `missed` | validUntil=2026-10-12; OA freshness=`stale` only on **2026-08-03** (after target); no intermediate revalidation events stored | Cannot reconstruct *when* entry condition became invalid vs still intentional deep wait |
| G2 | **Evidence that permits / requires entry-condition revision** | OA reasonCodes (`entry_passed_without_execution`); `nextAction: replace_plan`; monitoring alerts | Human OA recorded miss/replace; **no** structured rule linking higher-low / days-since-zone / RR-at-market → required revision | Adaptation trigger is manual/narrative, not evidence-gated |
| G3 | **Immutable original T0 vs later Plan adaptation** | T0 freeze design (immutable); live Plan is mutable; `decisionHistory` exists | **No freeze**; live Plan held same entry; history empty; adaptation not materialized as new decided Plan | Risk of conflating “original WAIT was wrong” with “executable level went stale” |
| G4 | **Pre-decision vs post-decision Reality binding** | Market Reality windows (Case-bound OHLCV) | No Case MR window cached for PLAN-003 at verify time; OBS manual maxPrice≠Yahoo high | User memory of June 350/360 can be mistaken for post-WAIT offers without explicit pre/post split |
| G5 | **Executable entry vs thesis zone versioning** | Thesis levels + plan `plannedEntry` | Thesis zone 350–355; plan entry 350; neither versioned after higher low 377 | No “current executable” distinct from “original planned” |
| G6 | **Supersede / replace_plan completion** | OA `replace_plan`, states `superseded` / `missed` | replace_plan signaled; plan closed `failed` + missed_opportunity **without** successor plan id | Learning cannot measure whether adaptation was attempted |
| G7 | **Playbook / Family B path for secular continuation** | `familyBAssessment`, layered entry hooks | `familyBAssessment=null`, `playbookId=null` | No playbook-level rule set for when deep-retest wait should yield to continuation participation |

---

## 4. What this Case already teaches (no classification)

1. **Pre-Plan** market did print **350–360** (late June).  
2. **Post-WAIT** market never returned to that band; closest approach **377.39** (+7.83% vs 350) before target.  
3. Holding original executable **350** through a higher-low then trend is consistent with a **stale executable condition / non-adaptation** hypothesis — distinct from “350 was touched and we still waited” over-optimization.  
4. Original WAIT text (“do not chase”) remains historically meaningful and must stay frozen; any future learning change belongs in **controlled adaptation + new Cases**, not T0 mutation.

---

## 5. Non-goals / forbidden

- Do **not** mutate PLAN-003 decision, thesis snapshot-as-T0, or fabricate a T0 freeze.  
- Do **not** overwrite OBS/LO from Yahoo (OBS maxPrice 495 and notes ~511 remain persisted; verified high 517.78 is separate).  
- Do **not** assign Case family A/B/C/D or good-filter / over-opt labels from this ledger alone.

---

## Provenance

- Yahoo daily OHLCV retrieve ~2026-09-03 (practical verify scripts; not persisted to market-reality store in this pass).  
- Plan / thesis / OA / OBS / LO: canonical Supabase read via MXT stores.  
- Companion packs: Practical Test Step 2 evidence pack · Step 3 verified Reality path.

---

## Human reconstruction (POST-017 completion)

Persisted as **HUMAN_RECONSTRUCTION only** in [`mxt-historical-learning-completion.md`](mxt-historical-learning-completion.md) §0 — not T0, not market fact. Practical primary diagnosis: **NON-ADAPTATION** (mapped into pending MAF `entry_quality` + `timing_quality`).
