# MTA Sample 001 — first real Scout corpus probe

**PROMPT ID:** `MTA-SAMPLE-001`  
**Date:** 2026-08-15  
**Mode:** Operational (no architecture, no new metrics, no Analytics UI, no Funnel, no waterfall, no product code)  
**Agent access:** Workspace seed + git archaeology only. **No Supabase credentials / no production export attached.**

---

## Access reality (must read first)

| Source | Accessible in this run? | Notes |
|--------|-------------------------|--------|
| `data/plans.json` | **Yes** | 2 Scouts (PLAN-001, PLAN-002). Neither has `outcome.recordedAt`. |
| `data/stock-theses.json` | **Yes** | ST-TSLA-001 only |
| `data/market-evidence.json` | **Yes** | 3 migrated structure notes for TSLA — **not** trigger/price verification |
| `data/learning-outcomes.json` | **Yes — empty** | `[]` |
| `data/observations.json` | **Yes — empty** | `[]` |
| `data/maf-experiments.json` | **Yes — empty** | `[]` |
| `data/trades.json` | **No (removed from repo)** | Prod = Supabase (`runtime-truth.md`). Local: `trades.json.example` only |
| Git history `data/trades.json` | **Partial** | Pre-migration artifact: **H001 AMZN** closed fill, **no `planId`** |
| Production Supabase (`trade_plans`, trades, LO, OBS, MAF) | **No** | Env has no `SUPABASE_URL` / service role |
| Docs naming live prod Scouts | **Yes (IDs only)** | PLAN-006 / PLAN-007 / PLAN-008 / GOOGL funding note — **no persisted rows here** |
| Demo / test fixtures | **Excluded** | Not used as production substitute |

**Rule applied:** if trigger, post-window extreme, or non-execution cannot be verified from stored evidence → classification = `insufficient_evidence`. No market invention. No fictitious fills.

---

## SAMPLE SUMMARY

| Metric | Value |
|--------|------:|
| Cases reviewed | **8** |
| Scout units in reviewed set | **7** (+ 1 orphan Trade excluded) |
| N total (Scout candidates) | **7** |
| N eligible (outcome classifiable without inference) | **0** |
| N with reliable outcome | **0** |
| N `insufficient_evidence` | **7** |
| Coverage % (`reliable / total`) | **0%** |
| Executed | **0** |
| Missed | **0** |
| Triggered without Trade | **0** |
| Invalidated | **0** |
| Expired (as *proven* outcome class) | **0** |
| Duplicate | **0** |
| Failed | **0** |

**Calendar note (not an outcome class):** PLAN-001 `validUntil` 2026-07-17 and PLAN-002 `validUntil` 2026-07-18 are both **before** sample date 2026-08-15. Current seed still stores status `watching` / `ready` (a prior commit briefly marked both `expired` **without** `outcome.recordedAt`). Calendar end ≠ verified `expired` Learning Outcome until evidence + Apply close the loop.

---

## CASE TABLE

| # | planId | ticker | stockFileId | playbook | window end | Trade | plan-outcome | LO | OBS | MAF | evidence quality | proposed class |
|---|--------|--------|-------------|----------|------------|-------|--------------|----|-----|-----|------------------|----------------|
| 1 | PLAN-001 | TSLA | ST-TSLA-001 | weekly-breakout | 2026-07-17 | no | none | none | none | none | setup partial; outcome none | `insufficient_evidence` |
| 2 | PLAN-002 | NFLX | — | layered-entry | 2026-07-18 | no | none | none | none | none | setup strong; outcome none | `insufficient_evidence` |
| 3 | PLAN-006 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ID only (backlog) | `insufficient_evidence` |
| 4 | PLAN-007 | GOOGL | ? | ? | ? | ? | ? | ? | ? | ? | ID + funding doc | `insufficient_evidence` |
| 5 | PLAN-008 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ID only (backlog) | `insufficient_evidence` |
| 6 | PLAN-xxx (AMZN revive template) | AMZN | ? | ? | template | ? | none | none | none | none | Control paste template | `insufficient_evidence` |
| 7 | PLAN-xxx (GOOGL note template) | GOOGL | ? | ? | template | ? | none | none | none | none | Control paste template | `insufficient_evidence` |
| — | *(orphan)* H001 | AMZN | — | — | — | yes closed | n/a | none | none | none | Trade without Scout | **excluded** (not a Scout unit) |

---

## CASE DETAILS

### Case 1 — PLAN-001 · TSLA

| Field | Value from store | Source |
|-------|------------------|--------|
| ticker | TSLA | `data/plans.json` |
| planId | PLAN-001 | plans |
| stockFileId | ST-TSLA-001 | plans + stock-theses |
| playbook/family | `weekly-breakout` / Weekly Breakout (no family field) | plans + playbooks |
| createdAt | 2026-07-10T12:00:00.000Z | plans |
| opportunity window | 2026-07-10 → 2026-07-17T23:59:59.000Z | `validFrom` / `validUntil` |
| thesis previa | Pullback to 340–355; 3R+ stop below 320 | plans.thesis + decision |
| planned entry | 348 | `plannedEntry` |
| maximumEntry | **missing** | not on plan |
| stop | 320 | `stopPrice` |
| target | 430 | `targetPrice` |
| trigger esperado | Wait for pullback to 340–355 (decision reasoning); not a discrete priced trigger event | decision + thesis |
| invalidation | Stock File: monthly close below 300; decision stop buffer below 320 | stock-theses.riskRules + decision.planningRisk |
| expiration | validUntil 2026-07-17 | plans |
| entry reached | **unknown** | no plan-outcome; no price tape |
| trigger datetime | **unknown** | — |
| max/min posterior | **unknown** | no market evidence for post-window path |
| theoretical / counterfactual R | **cannot demonstrate** | would require verified entry/stop/target triggers |
| Trade associated | no | no `linkedTradeId`; no local trades |
| realized R | n/a | — |
| realized P/L | **0** (no Trade) | rule |
| plan-outcome | none | — |
| LO / OBS / MAF | none | empty stores |
| evidence completeness | **partial** (ex-ante levels + window + Stock File; **no** outcome evidence) | — |
| missingFields | maximumEntry; discrete trigger timestamp; entryReached; stop/target triggers; post extremes; outcome; LO; OBS; MAF | — |
| contradictions | Seed status `watching` while calendar window ended; earlier git revision had status `expired` without `recordedAt` | plans history |
| confidence in outcome class | **none** | — |
| **classification** | **`insufficient_evidence`** | hindsight ban: cannot call thesis correct from later price without verified triggers |

**Analysis Edge (this case):** Ex-ante setup is documentable (zones, stop, target, window, wait verdict). **Valid opportunity outcome cannot be scored** without trigger/invalidation evidence.  
**Execution Edge:** No Trade → realized P/L = 0, but **capture classification blocked** (cannot distinguish expired vs never-triggered vs missed vs discretionary skip).

**Human export needed:** Supabase row for PLAN-001 (full JSON) + any linked Trade + LO/OBS/MAF + verified price path for window (or Applied `plan-outcome` with `evidenceStatus: verified`).

---

### Case 2 — PLAN-002 · NFLX

| Field | Value from store | Source |
|-------|------------------|--------|
| ticker | NFLX | plans |
| planId | PLAN-002 | plans |
| stockFileId | **missing** | no `stockThesisId` |
| playbook/family | `layered-entry` / Layered Entry (Entry Optimization) | plans + playbooks |
| createdAt | 2026-07-11T09:00:00.000Z | plans |
| opportunity window | 2026-07-11 → 2026-07-18T23:59:59.000Z | validFrom/Until |
| thesis previa | Support entry; thesis accepted; layered limits execution experiment | plans.thesis + decision |
| planned entry | 73 | plannedEntry + firstLimitPrice |
| maximumEntry | 73 (hard ceiling via layered `noChase` / highest limit) | layeredEntry.limits[0]=73; decision.executionRisk.late |
| stop | 68 | stopPrice |
| target | 88 | targetPrice |
| trigger esperado | Fill of layered limits at 73 / 72.2 / 71.4 | layeredEntry |
| invalidation | **not explicit on plan** (stop 68 is setup stop; Stock File absent) | — |
| expiration | validUntil 2026-07-18 | plans |
| entry reached | **unknown** | layered status still `planned`; no fills recorded |
| trigger datetime | **unknown** | — |
| max/min posterior | **unknown** | no market evidence |
| theoretical / counterfactual R | plannedRR stored as 5; arithmetic (88−73)/(73−68)=3.0 — **planned only**, not counterfactual outcome | plans |
| Trade associated | no | — |
| realized R / P/L | n/a / **0** | no Trade |
| plan-outcome / LO / OBS / MAF | none | — |
| evidence completeness | **partial** (ladder + go verdict + window; no Stock File; no outcome) | — |
| missingFields | stockFileId; explicit thesis invalidation; fill history; outcome; LO; OBS; MAF; post extremes | — |
| contradictions | `plannedRR: 5` vs level arithmetic R≈3; status `ready` after calendar end | plans |
| confidence | **none** for outcome | — |
| **classification** | **`insufficient_evidence`** | — |

**Ops note:** `monday-nflx-experiment.md` is a Playbook experiment checklist — **not** a recorded Scout outcome. Do not treat it as evidence of fill or miss.

**Human export needed:** Prod PLAN-002 + layered fill state + plan-outcome + any Trade + LO/OBS.

---

### Case 3 — PLAN-006 (production ID only)

| Field | Value |
|-------|--------|
| Evidence in this workspace | Named in `md/matrix/building-backlog.md` (Scout learning queue / retry sync when PLAN-008 live) |
| Persisted plan / outcome / Trade / LO / OBS / MAF | **none accessible** |
| **classification** | **`insufficient_evidence`** |
| **Required export** | Supabase `trade_plans` row `id=PLAN-006` (+ linked trade_id, outcome JSON, LO/OBS/MAF by plan_id) |

---

### Case 4 — PLAN-007 · GOOGL (production ID + design note)

| Field | Value |
|-------|--------|
| Evidence | `md/design/funding-follow-up-29-21.md` — operational GOOGL · PLAN-007 funding handoff; `execution-instruction-spec.md` example planId |
| Levels / window / outcome | **not in this workspace** |
| **classification** | **`insufficient_evidence`** |
| **Required export** | Full PLAN-007 Scout JSON from prod + capital reservation audit if any + plan-outcome + Trade if linked |

---

### Case 5 — PLAN-008 (production ID only)

| Field | Value |
|-------|--------|
| Evidence | Named beside PLAN-006 in building-backlog (live case context) |
| Persisted payload | **none** |
| **classification** | **`insufficient_evidence`** |
| **Required export** | Supabase PLAN-008 full row + learning objects |

---

### Case 6 — AMZN Control paste template

| Field | Value |
|-------|--------|
| Source | `data/control-paste-amzn-googl.json` — `decision-update` with `planId: "PLAN-xxx"` placeholder; trade-update targets H001 |
| Status | Template for human paste — **not** an applied Scout record |
| **classification** | **`insufficient_evidence`** |
| Note | Mentions revive after expiry and AMZN target zone 260–280 — useful ops hint, **not** sample evidence |

---

### Case 7 — GOOGL Control paste template

| Field | Value |
|-------|--------|
| Source | Same file — GOOGL retracting note; `planId: "PLAN-xxx"` |
| **classification** | **`insufficient_evidence`** |

---

### Excluded — H001 · AMZN (orphan Trade)

| Field | Value | Source |
|-------|--------|--------|
| id | H001 | git `0cd227a:data/trades.json` (pre Supabase migration) |
| ticker | AMZN | |
| entry / stop / exit | 240 / 230 / 225.9 | |
| status | closed | |
| closedAt | 2026-01-20 | |
| planId / linked Scout | **none** | |
| realized R (long, risk=10) | ≈ **−1.41 R** | computed from stored prices |
| realized P/L | (−14.1)×8 = **−112.8** (matches vault topics note) | |
| LO / OBS / MAF | none in seed | |

**Why excluded from Scout sample:** Sample unit is **Scout / plan-outcome**. H001 is a closed Trade with **no Scout link**. Using it would contaminate Analysis Edge with execution-only history and invent a Scout that never existed in store.

**Useful only as:** proof that realized R can be computed **when a Trade exists** — and that Trade Statistics must stay on this ledger, separate from Scout counterfactual R.

---

## SAMPLE QUALITY (aggregate)

| Gate | Result |
|------|--------|
| evidenceCompleteness | 2/7 have usable **ex-ante** Scout fields; **0/7** have complete **outcome** evidence |
| missingFields (systemic) | plan-outcome, LO, OBS, MAF, post-window tape, prod Scout rows, Trade↔plan links |
| contradictions | Status vs calendar expiry on seed; plannedRR vs arithmetic R on PLAN-002 |
| confidence in outcome classification | **0** cases above “none” |

Coverage formula used:

```text
coverage = N_reliable_outcome / N_total_scout_candidates
         = 0 / 7 = 0%
```

Eligible = reliable outcome class without inference = **0**.

---

## PROVISIONAL CAPTURE TEST

**Status: STOPPED — not computed.**

Expectancy Capture remains a **hypothesis**. No experimental available / captured / lost R totals are persisted or treated as canonical.

| Quantity | Value | Reason |
|----------|-------|--------|
| available opportunity R | **undefined** | No verified opportunity outcomes; no theoreticalResultR with evidence |
| captured realized R | **undefined** (Scout sample) | No Scout-linked Trade in accessible corpus. (Orphan H001 = −1.41 R is **Trade ledger only**, not Scout Capture) |
| lost opportunity R | **undefined** | Would require verified triggered_without_trade / UPL with counterfactual R |

### Denominators (documented, unused)

| Concept | Intended denominator | Included | Excluded |
|---------|----------------------|----------|----------|
| Available R | Sum theoretical/counterfactual R over Scouts with **verified** opportunity validity | none | all 7 (insufficient_evidence) |
| Captured R | Sum realized R of Trades **linked** to those Scouts | none | orphan H001 (no plan) |
| Lost R | Available − Captured for triggered-but-unexecuted with verified path | none | — |

### Treatment rules (held, not applied to numbers)

| Case type | Treatment |
|-----------|-----------|
| invalidated | Exclude from “available opportunity” if invalidated_before_entry; do not invent loss |
| expired | Count only with recorded outcome + evidence; calendar end alone ≠ expired class |
| missed / triggered_without_trade | realized P/L = **0**; counterfactual R only if triggers verified; never fake fill |
| partial fills | Need layered fill state from prod — **absent** |
| Trade with modified stop/target | Need Trade + original plan levels — **absent** for linked Scouts |

### Assumptions refused

- Inferring entryReached from later price direction  
- Using demo/test UPL fixtures as sample rows  
- Treating Control paste placeholders as Applied outcomes  
- Mixing H001 realized R into Scout Capture  

---

## DEFINITION FAILURES

1. **`expired` vs calendar `validUntil`:** Domain allows status `expired` and LO kind `expired`, but seed can remain `watching`/`ready` after window end with no `plan-outcome`. Sample cannot emit an unequivocal `expired` without Apply + evidence.  
2. **`missed` vs `triggered_without_trade` vs UPL:** Prompt list allows `missed` and `triggered_without_trade`; LO uses `missed_opportunity` and `unexecuted_plan_loss`. Without trigger evidence, mapping is ambiguous — correctly blocked here.  
3. **Opportunity validity without maximumEntry:** PLAN-001 lacks `maximumEntry`; hindsight rule still needs “price within allowed limits.” Incomplete for strict Analysis Edge pass/fail.  
4. **plannedRR ≠ level arithmetic:** PLAN-002 stores plannedRR 5 vs R≈3 from levels — which feeds “available R”? Undefined until definition chooses one source.  
5. **Scout without Stock File:** PLAN-002 has no `stockThesisId` — Analysis Edge thesis invalidation path incomplete.  
6. **Trade without Scout:** H001 shows Execution Edge can exist without Analysis Edge unit — join key `planId` / `linkedTradeId` is mandatory for Capture pairing.  
7. **Prod Scouts not in seed:** PLAN-006/007/008 prove the interesting corpus is **outside** the agent workspace — Sample 001 cannot finish until export lands.

---

## CONCLUSION

1. **¿Podemos medir Analysis Edge?** **Not yet on this corpus.** Ex-ante fields exist for 2 Scouts; **valid opportunity** (entry reached / invalidated / expired with evidence) is **not** measurable without production outcomes + verified triggers.  
2. **¿Podemos medir Execution Edge?** **Not for Scout-linked execution.** No Scout→Trade links in accessible data. Orphan H001 shows realized R is computable **only** on the Trade ledger.  
3. **¿Podemos separar counterfactual R de realized R consistentemente?** **In code/rules: yes** (`realizedResultR=0` when unexecuted; aggregates separate). **In this sample: N/A** — no counterfactual R rows and no linked realized R to compare.  
4. **¿Los denominadores son estables?** **No.** Coverage 0%; plannedRR vs arithmetic R conflict; expired status vs calendar unresolved.  
5. **¿Expectancy Capture está listo para formalizarse?** **No.**

---

## Required next action (human / ops — not product PR)

Provide a **production Scout sample export** (JSON) with **8–10 terminal or closable Scouts**, each including at minimum:

1. Full `TradePlan` / Scout row (levels, window, decision, layeredEntry if any)  
2. `outcome` if present (or explicit “missing”)  
3. Linked Trade(s) if any (`id`, entry, stop, target/exit, status, planId)  
4. LO + OBS + MAF rows keyed by `planId` / `tradeId`  
5. Optional: Market Evidence or human-verified trigger notes with timestamps (**no invented prices**)

Suggested dump shape:

```text
mta-sample-001-export/
  plans.json          # PLAN-00x rows from Supabase
  trades.json         # only trades linked to those plans
  learning-outcomes.json
  observations.json
  maf-experiments.json
  README.txt          # export time, environment, filter used
```

Then re-run **MTA-SAMPLE-001** against that export — still no Analytics UI, no Capture canonization until denominators stabilize.

---

## === MTA-SAMPLE-001 ===

```text
Cases reviewed: 8 (7 Scout candidates + 1 orphan Trade excluded)
Eligible cases: 0
Coverage: 0%
Executed: 0
Missed: 0
Triggered without Trade: 0
Invalidated: 0
Expired: 0 (proven)
Insufficient evidence: 7
Available R: undefined (not computed)
Captured R: undefined (not computed)
Lost R: undefined (not computed)
Definition failures: 7 (see section)
Capture ready: no
Required next action: Attach production Supabase Scout+Trade+LO/OBS/MAF export for 8–10 closable Scouts; re-run Sample 001; do not formalize Expectancy Capture; do not ship Analytics UI from this result.
```
