# MatrixTrade — AI engineering (single fleet)

**Status:** Canonical (2026-07-10).  
**Parent:** [strategic-planning-vision.md](strategic-planning-vision.md)

One communication engine for **Scouting Desk** and **Assistant** (`/exchange`). No parallel pipelines.

---

## Flow

```text
Copy AI package (mechanics + context + REQUEST)
  → paste in external AI
  → receive ONE AI Block (JSON)
  → Import in Dashboard Assistant or Inbox
  → human Apply
  → Stock File / scout / trade updated
```

**Rule:** AI never auto-applies. Human always Apply in `/inbox`.

---

## Code map

| Piece | Location |
|-------|----------|
| Unified context builder | `lib/ai-context.ts` — `buildAiContext`, `buildAiContextPackage` |
| Mechanics primer | `lib/matrix-mechanics-brief.ts` — `buildMatrixMechanicsBrief` |
| AI Block parse/validate | `lib/ai-block.ts`, `lib/bridge.ts` |
| Apply handlers | `lib/apply-trading-inbox.ts` |
| Exchange load | `lib/load-home-exchange.ts` |
| Scouting copy | `PreviewPlanning.tsx` |

---

## Context scopes

| Scope | Use | REQUEST block |
|-------|-----|---------------|
| `exchange` | `/exchange` full snapshot | All block types |
| `scouting` | Scouting Desk — mission + all files | Scouting-first |
| `scouting-ticker` | One suspect (e.g. TSLA) | Scouting-first |
| `stock-file` | Stock File detail page | Scouting-first |

Export order in every package:

```text
MATRIX MECHANICS → PLAYBOOK → STOCK FILE → SCOUTING STATE → REQUEST
```

---

## AI Block types

### Scouting priority (Phase 1)

| Type | Purpose | Apply |
|------|---------|-------|
| `scout-assessment` | Validate thesis — verdict go/wait/no/probe, reasons, **challenges** | Appends assessment to Stock File notes |
| `decision-update` | Scout decision on PLAN — verdict, confidence, risks, challenges | Appends `ScoutDecision` on plan; probe if verdict=probe |
| `file-update` | Propose changes to Stock File | Updates status, hypothesis, notes (version++) |

### Trade layer

| Type | Purpose |
|------|---------|
| `trade-proposal` | New trade |
| `trade-update` | Edit trade (stop, target, shares, status, notes, etc.) — **primary mutation path** |
| `trade-close` | Close trade |
| `trade-review` | Post-close review |
| `analysis` | Notes on trade |
| `playbook-create` / `playbook-update` | Playbook CRUD |

**UI rule:** Prefer `trade-update` / `trade-close` from external AI over per-field buttons in the app. See [external-ai-policy.md](external-ai-policy.md).

---

## scout-assessment shape

```json
{
  "type": "scout-assessment",
  "proposal": {
    "stockFileId": "ST-TSLA-001",
    "ticker": "TSLA",
    "verdict": "wait",
    "reasons": ["Price above primary zone", "R:R not met at current levels"],
    "challengesToThesis": ["Hypothesis assumes pullback — price still extended"],
    "conditionsToAdvance": ["Pullback to 340-355 with 3R+ to stop"],
    "minimumRRMet": false,
    "invalidationClear": true
  }
}
```

`verdict`: `go` | `wait` | `no` | `probe`  
`challengesToThesis` required — AI must contradict, not rubber-stamp.

**Note:** For scout **plan** decisions, use `decision-update` (canonical). `scout-assessment` appends to profile notes only.

---

## decision-update shape

```json
{
  "type": "decision-update",
  "proposal": {
    "planId": "PLAN-001",
    "verdict": "wait",
    "decisionConfidence": 68,
    "challenges": ["Price above zone", "R:R not met at spot"],
    "reasoning": "Wait for pullback to primary zone.",
    "planningRisk": { "structure": "HH/HL intact", "rr": "3R min not met" },
    "executionRisk": { "emotion": "avoid chase" },
    "thesisQuality": 70,
    "opportunityQuality": 45,
    "confirmationCost": {
      "currentRR": 4.2,
      "estimatedConfirmedRR": 2.6,
      "rewardConsumedPercent": 38,
      "assessment": "Waiting may push setup below Stock File minimum R:R."
    },
    "locationEvidence": "Entered primary support zone",
    "confirmationEvidence": "No higher low yet",
    "singleEntryOnly": true,
    "probe": {
      "trigger": "Close above 355 on 1D",
      "expires": "2026-07-17T23:59:59.000Z",
      "riskPercent": 0.1
    }
  }
}
```

`probe` required when `verdict` is `probe` (`trigger` + `expires`).

---

## file-update shape

```json
{
  "type": "file-update",
  "proposal": {
    "id": "ST-TSLA-001",
    "currentHypothesis": "Wait for 340-355; reject chase entries",
    "status": "watching",
    "notes": "Optional append — merged with AI import stamp on apply"
  }
}
```

At least one of: `status`, `currentHypothesis`, `notes`, `thesis`.

---

## Governance

1. Read `md/matrix/` before new AI or scouting code.
2. Extend `lib/ai-context.ts` and `lib/bridge.ts` — do not create a second export path.
3. New block types only when critical; register in `ai-block.ts` REQUEST + apply handler.
4. Design UI checklists **deprecated** — vision + this doc are the guide.

---

## Related

- [ai-block-workflow.md](../integrations/ai-block-workflow.md) — inbox flow (update scouting types)
- [library-alignment-backlog.md](library-alignment-backlog.md) — remaining doc sync
