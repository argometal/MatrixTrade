# Secular Trend Continuation — Playbook (MTA-002C)

**Status:** TESTING experiment (2026-07-22) — **not** a permanent engine rule.  
**Playbook id:** `secular-trend-continuation`  
**Family:** **B — Trend continuation** (separate from Correction / Rebound).  
**Parent:** [mta-002-operability-plan.md](mta-002-operability-plan.md) · methodology [asymmetric-entry-confirmation-cost.md](asymmetric-entry-confirmation-cost.md)  
**Sibling (Family A):** `structural-pullback-entry` — deep discount / high-R zone selection.

---

## Problem this solves

Matrix is well trained for **deep corrections** near support with large asymmetry. Forcing that method onto **persistent secular uptrends** produces:

```text
correct technical analysis
+ entry that almost never fills
= never execute
```

The opposite error — chasing every uptrend because “it always goes up” — destroys expectancy.

**This Playbook is a separate method**, not an exception bolted onto rebound rules.

---

## Family split (non-negotiable)

| Family A — Correction / Rebound | Family B — Secular Trend Continuation |
|---------------------------------|----------------------------------------|
| Deep correction / large discount | Orderly pullback, consolidation, breakout retest, post-compression |
| Entry near support / battle zone | Entry by method (pullback · retest · layered · probe) |
| High R, lower hit rate acceptable | Moderate R floor, higher continuity odds |
| Stop often near structural support | **Structural stop ≠ tactical stop** — both defined |
| Reject if zone never reached | Reject if **extension** too far / bad buy despite good trend |

Do **not** require Family A depth on a name that rarely discounts that far.

---

## Universe

- Multi-year (or clearly multi-quarter) **secular uptrend** intact  
- Higher highs / higher lows on the strategic TF (MTAE strategic role)  
- High liquidity / institutional-quality names preferred  
- Thesis invalidation clear on Stock File  

Out of universe: late-stage parabolic melt-ups without structure; broken secular thesis.

---

## Bull-trend entry framework (operational)

**Human/AI propose** entries, stops, target, roles, %. **Matrix** calculates R, validates, projects fill states, and learns via Observation/MAF.

### Entry states

`watch` · `starter_available` · `preferred_entry_available` · `deep_entry_available` · `extended_no_chase` · `structure_damaged` · `invalidated`

### Layer roles

`starter` · `preferred_pullback` (alias `preferred`) · `deep_pullback` · `reclaim_confirmation` (alias `confirmation`) · `custom`

### Starter policy

Controlled exception — not full conviction. Default max **30%** of planned allocation. Requires rationale + reserved better zones. Does not convert NO → GO.

### Fibonacci

Optional context only. Never standalone authorization.

### Code

- Types: `lib/family-b-types.ts`
- Classify / validate / snapshot: `lib/family-b-assessment.ts`
- Scout UI: `FamilyBBullTrendPanel`
- Apply: `decision-update` → `familyBAssessment` + `layeredEntry`
- Analyze package includes Family B section when playbook matches

---

## Allowed entry methods (pick one per Scout window)

| Method | When |
|--------|------|
| **Orderly pullback** | Slow correction, quieter volume, HTF structure held — not a crash discount |
| **Breakout retest** | Prior breakout level revisited as support |
| **Compression continuation** | Range / coil resolves in trend direction with defined invalidation |
| **Layered entry** | Prefer with `layered-entry` / `risk-weighted-layered-entry` execution experiments |
| **Probe** | Small risk when continuity likely but confirmation incomplete |

**Forbidden as default:** market chase of extended candles; using extended targets to justify a mediocre R.

---

## Extension & “good trend / bad buy”

Define **before** Scout GO:

1. **Max acceptable extension** — distance from last structural base / AVWAP-style context (qualitative ok until measured).  
2. **When to wait** for pullback vs enter breakout/retest.  
3. **Minimum R** for this family (floor may be **lower** than deep-rebound playbooks — state it explicitly on the Scout).  
4. **When a strong secular thesis is still NO** — stretched, poor participation, event risk, monthly room scarce.

---

## Stop model

| Stop | Role |
|------|------|
| **Structural** | Thesis invalidation (Stock File) — not used for planned R by default |
| **Tactical / strategy** | Plan `stopPrice` for R:R and risk — may sit above structural |

Mechanics rule unchanged: planned R uses **strategy stop**, never silent substitution of structural invalidation.

---

## Pipeline

```text
Secular thesis valid (MTAE + Stock File)
  → choose Family B method (not Family A depth by default)
  → Entry Solver (probable target, strategy stop, max admissible, min R)
  → optional layered / probe
  → Scout decision (go|wait|probe|no)
  → Trade
```

MTAE still owns technical only. Scout owns capital.

---

## Success / failure (experiment)

**Success metrics:** fill rate vs Family A on same universe, realized expectancy, average R, missed-scout rate, time-in-market.

**Failure / refute after 30–50 qualified observations if:**

- Continuity entries underperform waiting for deep pullbacks **on this universe**, or  
- Chase / extension entries dominate losses, or  
- Min R floor is routinely violated to “not miss” the trend.

---

## Apply / AI guidance

When Analyze with AI detects secular continuation without deep discount:

- Prefer this Playbook id over forcing `structural-pullback-entry` depth.  
- State family mismatch explicitly if charts show shallow pullback only.  
- Return `decision-update` / `scout-plan-create` with strategy stop + realistic R — not fantasy deep zones.

---

## Related

- [execution-experiments-layered-entry.md](execution-experiments-layered-entry.md)  
- [risk-weighted-layered-entry.md](risk-weighted-layered-entry.md)  
- [mtae-technical-analysis-engine.md](mtae-technical-analysis-engine.md)  
- Playbook JSON: `data/playbooks.json` → `secular-trend-continuation`
