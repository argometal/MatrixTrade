# Control panel IA

**Status:** Canonical (2026-07-22).  
**Parent:** [snapshot-catalog.md](snapshot-catalog.md) · [external-ai-policy.md](external-ai-policy.md) · [mtae-technical-analysis-engine.md](mtae-technical-analysis-engine.md)

---

## Purpose

**Control** is the global write + context-copy drawer.

### Primary (direct access)

| Entry | Job |
|-------|-----|
| **Matrix Mechanics** | Copy Matrix constitution once for a new AI chat |
| **Stock Files** | Pick one ticker → MTAE request + profile + linked scouts |
| **Apply** | Paste AI Block → Validate → Accept |

Stock Files stay **top-level**. They are not under Library.

### Library (reusable context catalog)

| Entry | Job |
|-------|-----|
| **Technical Analysis** | MTAE protocol + TF role maps — charts → `technical-assessment` (no capital) |
| **Playbook** | Method rules / checklists / stats |
| **Scout Desk** | Desk overview + monthly risk room |
| **Learning** | Existing MAF attribution protocol (`buildMafProtocolBrief`) — no mega Learning package |

There is **no Request / Universal Request / Start Work** layer in Control. The human states the task in natural language; the AI asks for the exact visible block label when more context is needed.

**MTAE is not Playbook and not Mechanics.** See [mtae-technical-analysis-engine.md](mtae-technical-analysis-engine.md).

---

## Interaction model

```text
1. Prefer Stock File → Analyze with AI (one package) for a ticker loop
2. Or copy Matrix Mechanics once into a new AI chat, then named Control slices as needed
3. Attach charts; discuss in Analysis Mode
4. AI returns ONE Apply-ready AI Block
5. Human: Stock File → Apply AI Result (or Control → Apply) → Validate → Accept
6. Open Scout to read decision / entry / R
```

Stock File Analyze package = operative prompt (5 lanes) + Mechanics + MTAE + dossier + active Scout + REQUEST.  
Code: `lib/stock-file-analyze.ts`. `openPanel({ step: "apply" })` lands Control on Apply.

---

## Naming rule (non-negotiable)

Labels must **name the payload** the human copies or the action they take.

| Allowed | Forbidden (examples) |
|---------|----------------------|
| Matrix Mechanics | Session, Train session, AI session |
| Stock Files | Case (ambiguous) |
| Apply | Update (legacy Control label), Import, Connect |
| Technical Analysis | Analysis (vague), Chart AI alone |
| Playbook | Method (ambiguous) under Mechanics |
| Scout Desk | Scouting without desk clarity |
| Learning | Coach, Attribution Engine (unless naming the MAF protocol row) |

**Do not rename for “simplicity”** if the new word is vaguer.

Folding Playbook or MTAE under Mechanics is forbidden. Folding Stock Files under Library is forbidden.

---

## Duplicate Mechanics policy

- Mechanics is the **primary** Control action.
- Control **filters** duplicate `mechanics` rows from Library → Playbook and from Stock File detail.
- Shared builders (`playbookSnapshotItems`, `stockProfileSnapshotItems`, trade window menu) may still include Mechanics for **standalone package portability** outside Control.
- Prefer presentation filtering over deleting shared builders.

---

## Forensic export — trade only

`{ID} forensic` ships **only** on `/trades/{ID}` when closed.

Copied forensic payload = **evidence only**:

- no embedded `buildMatrixMechanicsBrief()`
- no embedded `TRADE_FORENSIC_AI_REQUEST` / universal Request

**Forbidden:** Control closed-trade / forensic picker.

---

## Learning / MAF in Control

| Exposed | Not exposed in Control Library |
|---------|--------------------------------|
| MAF attribution protocol brief | Per-trade MAF experiments list |
| | Observation UX form (NEXT — evaluate after this IA) |
| | Expectancy aggregation dashboards (EVALUATION) |

---

## Agent / PR checklist

1. Primary order: Matrix Mechanics · Stock Files · Apply · Library.
2. Stock Files remain direct-access.
3. User-facing write label is **Apply** (internal `ControlPanelUpdate` may keep its name).
4. No Request layer.
5. Forensic evidence-only on trade detail.
6. Update `snapshot-catalog.md` / `runtime-truth.md` when homes change.
7. Bump `MATRIX_MECHANICS_REVISION` when brief/snapshot text changes.

---

## Code map

| Piece | Location |
|-------|----------|
| Control UI | `app/components/control-panel/MatrixControlPanel.tsx` |
| Apply UI (internal name) | `ControlPanelUpdate.tsx` |
| Section ids | `lib/control-panel-types.ts` |
| Loader | `lib/load-control-panel-data.ts` |
| MTAE protocol | `lib/mtae-brief.ts`, `lib/mtae-snapshot.ts` |
| MAF protocol | `lib/maf-brief.ts` |
| Forensic item | `lib/snapshot-trade-packages.ts` → `tradeForensicSnapshotItem` |

---

## Related

- [mtae-technical-analysis-engine.md](mtae-technical-analysis-engine.md)
- [maf-matrix-attribution-framework.md](maf-matrix-attribution-framework.md)
- [snapshot-catalog.md](snapshot-catalog.md)
- [runtime-truth.md](runtime-truth.md)
