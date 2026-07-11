# ADR-0001 — Trade Lifecycle v1

| Field | Value |
|-------|-------|
| **Status** | Accepted — **conceptual**; implementation follows [ADR-0002](adr-0002-trade-evaluation.md) (`TradeEvaluation` entity, not fields on `Trade`) |
| **Date** | 2026-07-11 |
| **Deciders** | Product / architecture |
| **Scope** | MatrixTrade `Trade` + `Playbook` domain model |
| **Related** | [scout-execution-model.md](scout-execution-model.md) · [runtime-truth.md](runtime-truth.md) · [v2-engine-architecture.md](v2-engine-architecture.md) |

---

## Context

### Problem

A trade currently ends when the financial position is closed (`status: "closed"`).

That is insufficient.

MatrixTrade measures **decision quality**, not only financial outcome. Many trades continue providing information after the position is closed:

- Did the original target get reached?
- What was Maximum Favorable Excursion (MFE) / Maximum Adverse Excursion (MAE) after exit?
- Did price recover after stop?
- Did the thesis remain valid over the intended horizon?

Therefore the **analytical lifecycle** must be independent from the **financial lifecycle**.

### Current runtime (honest)

| Today | Location |
|-------|----------|
| `TradeStatus = "pending" \| "open" \| "closed"` | `lib/types.ts` |
| `closedAt` | financial close timestamp |
| Post-close review (`reviewedAt`, `mistakes`, `lesson`) | human review — not tied to observation window |
| Playbook has no horizon fields | `lib/playbook-types.ts` |

This ADR does **not** change Scout/PLAN objects. It extends the **Trade** case after execution.

---

## Decision

Separate the trade into **two independent lifecycles**. A trade is completely finished only when **both** are complete.

### 1. Financial lifecycle (`positionStatus`)

Tracks money and exposure.

| State | Meaning |
|-------|---------|
| `planned` | Sized and authorized; position not yet open (maps from today `pending`) |
| `active` | Position open (maps from today `open`) |
| `position_closed` | Position flat; realized P/L frozen (maps from today `closed`) |

**Rule:** No further changes to financial metrics after `position_closed`.

### 2. Analytical lifecycle (`analysisStatus`)

Tracks hypothesis evaluation and learning evidence.

| State | Meaning |
|-------|---------|
| `open` | Case active while position is `planned` or `active` |
| `observation` | Position is `position_closed`; Matrix continues recording market behavior against the original thesis |
| `concluded` | Enough evidence exists; case closed for learning |

**Rule:** Closing the position **does not** conclude the case. The case remains analytically open until `concluded`.

### Completion gate

A trade becomes `analysisStatus: "concluded"` only when:

1. **Observation window expires** (`now >= observationUntil`), **or**
2. **Analyst explicitly concludes** the case (enough evidence before window end).

At conclusion, Matrix stores structured outcomes (see [Conclusion artifacts](#conclusion-artifacts)).

---

## Horizon ownership (Playbook, not Trade)

**Do not hardcode horizon days on the Trade.**

Observation windows belong to the **method** (Playbook), not the individual execution. The trade **inherits** horizons at open time and snapshots the resolved window on the trade record.

### Playbook fields (new)

```json
{
  "id": "weekly-breakout",
  "name": "Weekly Breakout",
  "expectedHorizonDays": 90,
  "maximumObservationDays": 120
}
```

| Field | Role |
|-------|------|
| `expectedHorizonDays` | Normal thesis evaluation window for this method |
| `maximumObservationDays` | Hard cap on post-close observation (auto-conclude at expiry) |

### Examples (future playbooks)

| Playbook | `expectedHorizonDays` | `maximumObservationDays` |
|----------|----------------------:|---------------------------:|
| Weekly Breakout | 90 | 120 |
| Mean Reversion | 45 | 60 |
| Position Trade | 180 | 240 |

### Swing v1 defaults

When a playbook omits these fields, apply **Swing v1** defaults at read time:

- `expectedHorizonDays = 90`
- `maximumObservationDays = 120`

Defaults are **not** stored on every trade; they resolve from playbook + fallback constant.

### Trade resolution at `active` transition

When `positionStatus` becomes `active`:

1. Resolve playbook (or Swing v1 fallback).
2. Set `openedAt` if not already set.
3. Compute and persist `observationUntil` as:

   `observationUntil = positionClosedAt + maximumObservationDays`

   (`observationUntil` is written when `positionClosedAt` is set; until then it remains unset.)

When `positionStatus` becomes `position_closed`:

1. Set `positionClosedAt` (financial close — may alias legacy `closedAt` during migration).
2. Set `analysisStatus = "observation"`.
3. Compute `observationUntil = positionClosedAt + resolvedMaximumObservationDays`.

---

## New and changed fields

### Trade

| Field | Type | Notes |
|-------|------|-------|
| `positionStatus` | `"planned" \| "active" \| "position_closed"` | Replaces semantic use of `status` |
| `analysisStatus` | `"open" \| "observation" \| "concluded"` | Independent of position |
| `openedAt` | ISO timestamp | Position became active |
| `positionClosedAt` | ISO timestamp | Position flat; P/L frozen |
| `observationUntil` | ISO timestamp | Auto-conclude boundary |
| `concludedAt` | ISO timestamp | Analytical case closed |

**Deprecated (migration period):**

| Legacy | Maps to |
|--------|---------|
| `status: "pending"` | `positionStatus: "planned"`, `analysisStatus: "open"` |
| `status: "open"` | `positionStatus: "active"`, `analysisStatus: "open"` |
| `status: "closed"` | `positionStatus: "position_closed"`, `analysisStatus: "observation"` or `"concluded"` if `concludedAt` set |
| `closedAt` | `positionClosedAt` |

**Not on Trade:** `expectedHorizonDays`, `maximumObservationDays` — playbook only.

### Playbook

| Field | Type | Default (Swing v1) |
|-------|------|--------------------|
| `expectedHorizonDays` | number | 90 |
| `maximumObservationDays` | number | 120 |

---

## During observation

While `positionStatus === "position_closed"` and `analysisStatus === "observation"`:

Matrix records **analytical metrics only**. Financial metrics do not change.

### Recorded signals (v1 minimum)

| Signal | Question |
|--------|----------|
| Target reached | Did price hit the original target after exit? |
| MFE post-exit | Maximum favorable excursion after close |
| MAE post-exit | Maximum adverse excursion after close |
| Time to target | Days from exit to target touch (if any) |
| Time to invalidation | Days from exit to thesis invalidation level |
| Stop recovery | Did price recover through the stop after exit? |
| Thesis validity | Did the original thesis remain valid over the horizon? |

Implementation may store these in a nested `observation` object or append-only evidence log. Storage shape is a separate ADR; **behavior is fixed here**.

### UI implication

- Trades in observation appear in **Review / learning queues** even when P/L is final.
- Dashboard “open work” includes analytically open cases, not only open positions.

---

## Conclusion artifacts

When `analysisStatus` becomes `concluded`, persist:

| Artifact | Content |
|----------|---------|
| `thesisOutcome` | Did the hypothesis play out? (`validated` \| `invalidated` \| `inconclusive`) |
| `executionOutcome` | Quality of entry/exit/management (may reuse existing review scores) |
| `timingOutcome` | Was horizon / timing appropriate? |
| `finalLesson` | Consolidated lesson (may supersede or merge `lesson` from human review) |

Human review (`mistakes`, `qualityEntry`, etc.) may occur **during** observation; conclusion **freezes** the learning record.

---

## Invariants (must hold in code)

1. `position_closed` ⇒ no mutation of entry, exit, shares, stop, target, or realized P/L.
2. `concluded` ⇒ `position_closed` (cannot conclude an active position analytically without closing it first).
3. `observationUntil` is derived from playbook + `positionClosedAt`, not user-editable per trade (v1).
4. Auto-conclude when `now >= observationUntil` unless analyst already concluded.
5. A trade with `analysisStatus !== "concluded"` is **not** a finished learning case.

---

## Consequences

### Positive

- Separates “trade is flat” from “case is learned.”
- Playbook-specific horizons without per-trade migration debt.
- Enables post-exit MFE/MAE and thesis validation — core to decision quality.
- Aligns with Matrix mission: expectation database, not trade log.

### Negative / cost

- More states → UI and queries must filter on both lifecycles.
- Background job or on-read check needed for observation expiry.
- Market data feed required for observation metrics (out of scope for this ADR’s first slice).

### Migration

1. Add new fields with defaults derived from existing `status` / `closedAt` / `reviewedAt`.
2. Dual-read: accept legacy `status` while writing new fields.
3. Dual-write period, then deprecate `status` in a follow-up ADR.
4. Existing `closed` trades without `concludedAt` → `analysisStatus: "observation"` with `observationUntil` backfilled from `positionClosedAt + playbook maximumObservationDays`.

---

## Out of scope (v1)

- Scout / PLAN lifecycle changes
- Automatic market data ingestion (manual or AI-assisted observation notes allowed as interim)
- Playbook UI for editing horizon fields (defaults apply; config UI later)
- Observation metrics JSON schema (follow-up ADR or implementation spec)

---

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Single `status` enum with more values | Couples money and learning; hard to query “flat but still learning” |
| Horizon days on Trade | Duplicates playbook knowledge; breaks when method horizons differ |
| Conclude on position close | Loses post-exit evidence; contradicts decision-quality mission |
| Infinite observation | Cases never close; learning queue grows unbounded |

---

## Implementation note for agents

**Do not redesign this ADR during implementation.** If a detail is missing, add a follow-up ADR or append an amendment section here. Cursor and other agents should treat this document as the closed decision for Trade Lifecycle v1.
