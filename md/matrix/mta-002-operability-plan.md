# MTA-002 — Operability plan (forward)

**Status:** Forward plan (2026-07-22) — **important, not emergency**. Still polishing the loop; do **not** start another large engine.  
**Parent contract:** [runtime-truth.md](runtime-truth.md) · [building-backlog.md](building-backlog.md) · [v2-engine-architecture.md](v2-engine-architecture.md)  
**Rule:** Convert what is already built into a **fast, repeatable, usable** operating cycle.

---

## Diagnosis (accepted)

The bottleneck is **not** missing analytical capacity. It is:

| Friction | Symptom |
|----------|---------|
| Chat re-training | Every new chat needs architecture re-explained |
| Unclear UI | Too many near-synonym buttons / routes |
| Slow Apply | Hard to land one proposal quickly |
| Strategy mix | Rebound / deep-discount logic applied to secular uptrends → correct analysis, entry never hits |
| Build > use | Surface grew faster than daily operating habit |

**Next step is not a new engine.** Next step is operability.

---

## Scout vs incomplete trades (boundary)

| Surface | Job |
|---------|-----|
| **Scout war room** | Cases to **watch / re-enter** — ordered **planned R high → low** so strongest asymmetry is monitored first; mid/low R → re-analyze, deprecate, or improve R |
| **Trades / Dashboard (brainstorm)** | Alert **closed but not completed** fills (missing review / fields). Today: closed ≠ complete. **Do not** make this Scout’s mission |

Shipped polish (this pass): Scout Case dropdown + chips sort by planned R; copy clarifies Scout ≠ incomplete-fill queue.

---

## Three immediate fronts (order)

### 1. Close the operative AI prompt (master)

Any new chat must be able to:

```text
Matrix Mechanics → Stock File → MTAE charts → Scout entry eval → decision → Apply block
```

without a manual architecture lecture.

Train the model to keep **five lanes** separate:

1. **Technical** — structure, zones, targets, invalidation, participation  
2. **Opportunity quality** — asymmetry, distance to entry, zone reach probability, realistic R:R, relative vs other candidates  
3. **Entry** — max admissible, recommended, type, stop, probable / extended target, activation conditions  
4. **Decision** — go | wait | probe | no  
5. **Structured exit** — short rationale, uncertainties, conditions, **valid Apply JSON**

**Acceptance test:** same case → several chats → sufficiently consistent results (not “prompt sounds complete”).

### 2. Radically simplify the human UI

Real flow for one ticker:

1. Open Stock File  
2. Copy AI package  
3. Paste into Apply  
4. See updated decision  

**Minimum UI proposal (per Stock File):**

| Primary | Job |
|---------|-----|
| **Analyze with AI** | One package for current state (Mechanics + MTAE + Stock File + active Scout + relevant history + concrete ask) |
| **Apply AI Result** | Paste → validate → show exact diffs |
| **Open Scout** | Decision, entry, stop, targets, R, conditions, wait reasons, next action |

Everything else under **Advanced / History / Library / System**.

**Rule:** ≤ **3 primary actions** per screen.

Maps onto existing Control (Mechanics · Stock Files · Apply · Library) — do not invent a parallel Control taxonomy; **collapse Stock File chrome** toward the three actions.

### 3. Separate two Playbook families

| Playbook | Seeks | Must not |
|----------|-------|----------|
| **A. Correction / Rebound Entry** | Deep correction, support zone, clear invalidation, defined stop, high R, entry near zone | Be forced onto names that rarely discount that far |
| **B. Secular Trend Continuation** | LT uptrend, orderly pullback, consolidation, breakout retest, post-compression continuation, layered entry, structural vs tactical stop, less discount / higher continuity odds | Chase every uptrend because “it always goes up” |

Trend playbook must define: acceptable extension, when to wait pullback, breakout vs retest vs layered vs probe, minimum R, when a good trend is still a bad buy.

---

## Construction phases

| Phase | Goal | Deliverables |
|-------|------|--------------|
| **MTA-002A — Operability** | Cut time from open ticker → applicable decision | Master prompt; auto package per Stock File; one Analyze + one Apply; Scout decision visible; redundant buttons retired or demoted |
| **MTA-002B — Prompt validation** | Consistency without live capital | 10–20 candidates: AI reply, entry, decision, contradictions, cross-chat consistency, misreads, missing fields, human fixes |
| **MTA-002C — Trend Continuation Playbook** | Separate method, not rebound exception | Secular uptrend → pullback/retest/compression → entry → stop model → probable target → capital decision |

### Explicitly **not now**

Automatic Coach · wide stats dashboards · new AI layers · broker automation · more Library · more Control categories · parallel prompt systems.

---

## Concrete work queue (recommended)

1. Audit current Mechanics + MTAE + Stock File + Scout package prompts  
2. Consolidate into **one operative master prompt**  
3. Design Stock File **3-action** UI (reuse Control Apply; do not fork write paths)  
4. Run 10–20 candidate validation log (002B)  
5. Record calibrations (`technical-calibration` / human notes)  
6. Author **Secular Trend Continuation** Playbook (002C)

---

## Compare to current contract (what’s pending)

| Contract item (`runtime-truth` / `building-backlog`) | Relation to MTA-002 |
|-----------------------------------------------------|---------------------|
| **NEXT:** Closed-trade Observation UX (`observation-update`) | **Complementary polish** — closes incomplete closed-trade loop on **Trades**, not Scout. Fits “alert closed≠complete” brainstorm; schedule **after or beside** 002A prompt work, not as a new engine |
| **EVALUATION:** MAF expectancy aggregation | **Defer** — needs attributed sample + real consumer; aligns with “no wide stats dashboards now” |
| MTAE Phase B (VP / AVWAP) | **Out of scope now** — already contract OUT OF SCOPE |
| Scoped AI Grant API | **ON HOLD** (August) — orthogonal; keep frozen |
| Control IA shipped | **Foundation for 002A** — Mechanics / Stock Files / Apply / Library already exist; 002A collapses *usage*, not rebuilds Control |
| MAF + LO + OBS shipped | **Keep for learning**; do not expand to Coach/dashboards in 002 |
| Participation Phase A shipped | **Feed master prompt** (lane 1 participation); no Phase B |
| Library MD alignment | Done — vision vs program clarified |
| Scout Case R sort | **Shipped polish** — operability micro-fix toward “watch highest R first” |

### Priority reconciliation

| Priority | Item |
|----------|------|
| **P0 now** | MTA-002A — master prompt + Stock File 3-action path (docs → thin UI) |
| **P1** | Incomplete closed-trade alert / Observation UX on **Trades** (contract NEXT) |
| **P2** | MTA-002B validation log (ops, low code) |
| **P3** | MTA-002C Trend Continuation Playbook |
| **Hold** | MAF aggregation, Coach, VP/AVWAP, grants until resume |

**North star:** Matrix does not need to be larger. It needs the strong architecture already shipped to be usable in minutes, without re-training every chat or drowning in UI.

---

## Related

- [control-panel-ia.md](control-panel-ia.md)  
- [ai-engineering.md](ai-engineering.md)  
- [mtae-technical-analysis-engine.md](mtae-technical-analysis-engine.md)  
- [scout-execution-model.md](scout-execution-model.md)  
- [building-backlog.md](building-backlog.md)
