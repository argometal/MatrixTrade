# MXT — Market Reality Evidence Contract

**Status:** SEALED EVIDENCE CONTRACT (Prompt #12A)  
**Mode:** Documentation only — not an acquisition or implementation authorization  
**Companion Core:** [mxt-edge-learning-mission-governance.md](mxt-edge-learning-mission-governance.md) · [mxt-core-learning-adaptation-doctrine.md](mxt-core-learning-adaptation-doctrine.md)

---

## Correction of Prompt #12 framing

Prompt #12 BLOCKED because Cursor did not find **usable Market Reality for Case 1 (TSLA / PLAN-001)** in the sources it could inspect.

That is **not** equivalent to:

> “MXT lacks Market Reality as a concept / learning layer.”

MXT’s learning chain already includes Market Reality (post-decision evidence). Observation records already contemplate price extrema, terminal events, and a `market_feed` data-source enum. The open question is **acquisition, binding to Cases, and retention** — not whether Reality belongs in the model.

**Do not** treat #12 as proof that Reality is out of scope.

---

## Purpose

Define the **minimum objective evidence** MXT needs so that, for a Case:

1. Ex-ante belief stays frozen (SUPPORTED LEGACY or VERIFIED T0).
2. Post-decision Reality can be reconstructed **without** contaminating decision-time knowledge.
3. Volume can later support Cross-Case questions about **participation / conviction**, without becoming a simplistic “high volume = confirm” rule.
4. Charts/screenshots remain valuable as **contextual** evidence, not the primary computational source.

This contract deliberately **does not** choose a data provider.

---

## Temporal rule (non-negotiable)

```text
EX-ANTE  (Thesis / Plan / Decision / T0 or SUPPORTED LEGACY)
    ≠
POST-DECISION  (Market Reality / Outcome)
```

- Post-decision OHLCV/Volume is **Market Reality** (post-decision evidence).
- Fetching or attaching Reality **after** decision time does **not** upgrade historical T0 confidence.
- Do **not** retroactively create an immutable #8 T0 freeze from post-decision Reality.
- Do **not** rewrite T0 / decision-time evidence packets from Reality.
- **T0 preserves what was known then.** It does **not** authorize hiding what the system knows now.
- Market Reality must remain available to evaluation/learning systems; it must **not** be withheld merely because a deprecated Blind/Reveal ceremony has not occurred.
- **Blind** as a required product workflow and **Reveal** as a required ceremony are **DEPRECATED** (MTA 012). Do not invent a replacement ceremony.

---

## Canonical Market Reality atom

**Minimum computational atom:**

```text
Market Reality bar =
  Open / High / Low / Close / Volume
  + timestamp (bar open or canonical bar time)
  + timeframe
  + instrument (ticker + market identity as used by MXT)
  + source (provider / import / manual-verified label)
  + retrievedAt (when MXT obtained the bar)
```

Shorthand: **OHLCV + timestamp + timeframe + source (+ retrievedAt)**.

From OHLCV (and Case geometry), MXT may **derive** later without storing dozens of indicator series:

| Derivable (examples) | Requires |
|----------------------|----------|
| Level touches / crosses | OHLCV + ex-ante levels |
| Level event order | OHLCV sequence + levels |
| MFE / MAE vs planned geometry | OHLCV + planned entry/stop/target definitions |
| Time-to-move | OHLCV timestamps + defined event |
| Range / volatility summaries | OHLCV |
| Relative volume | Volume + defined baseline window |
| Breakout / pullback / rejection sequencing | OHLCV (+ optional Relative Volume) |
| Stop-before-target vs target-before-stop | OHLCV + levels |

**Do not** invent derived values when bars or definitions are missing → `UNAVAILABLE`.

---

## Volume Reality (distinct dimension)

Price path alone answers **what price did**.

**Volume Reality** addresses **how the move occurred** (participation), as objective evidence — **not** automatic confirmation.

### Measure (when bars exist)

Conceptual variables (names illustrative; implementation later):

- absolute volume
- **relative volume** ≈ volume in event window / comparable baseline for **the same instrument**
- volume during breakout / expansion
- volume during pullback
- volume during rejection / reversal
- joint **price + volume** patterns (descriptive)
- volume anomalies vs that asset’s own baseline

### Explicit non-rules (for now)

Do **not** encode:

- high volume ⇒ thesis confirmed  
- low volume ⇒ ignore move  
- TSLA volume comparable raw to AMZN volume  

Relative volume is **self-referenced per ticker** unless a later sealed study authorizes otherwise.

### Cross-Case research questions (future — not conclusions now)

After enough Cases with Volume Reality:

- When thesis direction was later consistent, was there volume expansion before/during the move?
- When expected pullback never arrived, was the advance accompanied by exceptional relative volume?
- When entries were early, was participation still thin?

These remain **hypotheses to test**, not product rules.

---

## Role of charts / screenshots

| Role | Charts / drawings | OHLCV |
|------|-------------------|-------|
| Primary computational Reality | No | Yes (when available) |
| Contextual / interpretive evidence | Yes | Supports metrics |
| What the human was seeing (zones, structure marks) | Yes | Incomplete alone |
| Reproducible level/MFE/MAE/Volume Reality | Weak alone | Strong when retained |

Intended division of labor:

```text
Human:     screenshot when it adds interpretation
MXT:       OHLCV (and derived Reality) for objective evidence
Assistant: reason over Case + metrics + chart when needed
```

Images **must not disappear**; they demote from sole Reality source to **context**.

---

## Retention principle (policy undecided — constraint only)

Prefer:

> Request the bars needed to evaluate a Case, and retain the **minimum evidence** required for the evaluation to remain **reproducible**.

Exact retention windows, compression, and purge rules are **out of scope for #12A** (decide in #12C / later ops policy).

Forbidden by this contract:

- claiming Reality exists without bars or verified substitutes
- “remembering” Reality only as chat narrative
- storing speculative indicators as if they were ground truth

---

## Binding to Case / Market Reality

Market Reality for a Case must be bindable to:

- `planId` and/or `stockThesisId` / ticker
- decision boundary timestamp (historical T0-like or freeze `t0`)
- observation window label(s) (e.g. original plan validity; longer retrospective window — **labeled**, not silently treated as historical #8 horizon)

Existing Observation fields (`maxPrice`, `minPrice`, `mfe`, `mae`, terminal events, `dataSource: market_feed`) are **compatible summaries**, not a substitute for the underlying OHLCV atom unless provenance is explicit.

---

## What #12A does **not** authorize

- Choosing a vendor (Yahoo, Polygon, broker, etc.)
- Building or wiring a feed
- Retroactive T0 freezes
- Automatic “volume confirms” Playbook rules
- Cross-Case volume conclusions
- Edge Decomposition of Case 1 without Reality
- Production changes

---

## Ordered next prompts (authorized sequence)

```text
#11 Evidence Recovery          → done (Case 1 ex-ante PARTIAL / SUPPORTED LEGACY)
#12 Reality attempt            → BLOCKED (no usable Reality found for Case 1 in inspected sources)
#12A Reality Evidence Contract → this document (incl. Volume Reality)
#12B Existing Reality Pipeline Audit
     → locate how MXT currently intends to store/bind Reality and why Case 1 had none usable
#12C Acquisition Strategy
     → compare existing mechanism vs external API vs import/export vs manual/chart
     → least-friction path; retention policy draft
#12 retry                      → reconstruct Case 1 Market Reality with legitimate source
#13 Case 1 Edge Decomposition  → only when Reality integrity is at least PARTIAL/VERIFIED
```

---

## Relation to Edge Decomposition

`externalConditions` in the Edge Decomposition Engine already reserves room for post-decision Reality (and currently leaves volume/regime as null when unsupported).

This contract defines what must eventually populate that layer **objectively**. It does not change the engine in #12A.

---

**SEALED EVIDENCE CONTRACT.** Provider choice and pipeline audit follow #12B / #12C — not this document.
