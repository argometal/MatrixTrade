# Control panel IA

**Status:** Canonical (2026-08-15 · Prompt 15-12).  
**Parent:** [snapshot-catalog.md](snapshot-catalog.md) · [external-ai-policy.md](external-ai-policy.md) · [mtae-technical-analysis-engine.md](mtae-technical-analysis-engine.md)

---

## Purpose

**Control** is the global write + context-copy drawer.

### Primary (direct access)

| Entry | Job |
|-------|-----|
| **Dashboard snapshot** | Same global context as Dashboard — one-tap copy on Control home (not a nav section) |
| **MTA Mechanics** | Copy Matrix constitution once for a new AI chat (+ **Apply schema contract** copy row in the same drawer) |
| **Stock Files** | Pick one ticker → MTAE request + profile + linked scouts |
| **Apply** | Paste AI Block → Validate → Accept |

Stock Files stay **top-level**. They are not under Library.

### Library (reusable context catalog)

| Nav entry | Exact copy row(s) | Job |
|-----------|-------------------|-----|
| **Technical Analysis** | **MTAE protocol** (+ TF maps) | Charts → `technical-assessment` (no capital) |
| **Playbook** | **Playbook snapshot** | Method rules / checklists / stats |
| **Scout Desk** | **Scout desk overview** | Desk overview + monthly risk room |
| **MAF** | **MAF attribution protocol** | MAF protocol only — not a mega Learning package |

**Library Index** is a copy row on Library home (above the nav rows).

There is **no Request / Universal Request / Start Work** layer in Control. The human states the task in natural language; the AI asks for the exact **visible copy-row label** when more context is needed.

**MTAE is not Playbook and not Mechanics.** See [mtae-technical-analysis-engine.md](mtae-technical-analysis-engine.md).

---

## Interaction model

```text
1. Prefer Stock File → Analyze with AI (one package) for a ticker loop
2. Or copy MTA Mechanics once into a new AI chat, then named copy rows as needed
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
| MTA Mechanics | Session, Train session, AI session, Matrix Mechanics (legacy docs) |
| Apply schema contract (copy row under Mechanics) | Presenting schema as a primary nav item |
| Stock Files | Case (ambiguous) as Control home |
| Apply | Update (legacy Control label), Import, Connect |
| Technical Analysis (nav) / MTAE protocol (copy) | Asking to “copy Technical Analysis” |
| Playbook (nav) / Playbook snapshot (copy) | Method (ambiguous) under Mechanics |
| Scout Desk (nav) / Scout desk overview (copy) | Scouting without desk clarity |
| MAF (nav) / MAF attribution protocol (copy) | Asking to “copy Learning” |

**Do not rename for “simplicity”** if the new word is vaguer.

Folding Playbook or MTAE under Mechanics is forbidden. Folding Stock Files under Library is forbidden.

Canonical SNAPSHOT MENU: `lib/visible-snapshot-menu.ts` → embedded in Mechanics via `formatSnapshotMenuForMechanics()`.

---

## Duplicate Mechanics policy

- Mechanics is the **primary** Control action.
- Control **filters** duplicate `mechanics` rows from Library → Playbook and from Stock File detail.
- Shared builders (`playbookSnapshotItems`, `stockProfileSnapshotItems`, trade window menu) may still include Mechanics for **standalone package portability** outside Control.
- Prefer presentation filtering over deleting shared builders.

---

## Forensic export — trade only

`{TICKER} · {ID} forensic` ships **only** on `/trades/{ID}` when closed.

Copied forensic payload = **evidence only**:

- no embedded `buildMatrixMechanicsBrief()`
- no embedded `TRADE_FORENSIC_AI_REQUEST` / universal Request

**Forbidden:** Control closed-trade / forensic picker.

---

## MAF in Control

| Exposed | Not exposed in Control Library |
|---------|--------------------------------|
| MAF attribution protocol brief | Per-trade MAF experiments list |
| | Observation UX form (NEXT — evaluate after this IA) |
| | Expectancy aggregation dashboards (EVALUATION) |

---

## Agent / PR checklist

1. Primary order: MTA Mechanics · Stock Files · Apply · Library.
2. Stock Files remain direct-access.
3. User-facing write label is **Apply** (internal `ControlPanelUpdate` may keep its name).
4. No Request layer.
5. Forensic evidence-only on trade detail.
6. Update `snapshot-catalog.md` / `runtime-truth.md` when homes change.
7. Bump `MATRIX_MECHANICS_REVISION` when brief/snapshot text changes.
8. SNAPSHOT MENU only from `lib/visible-snapshot-menu.ts` — no divergent hand lists.

---

## Code map

| Piece | Location |
|-------|----------|
| Control UI | `app/components/control-panel/MatrixControlPanel.tsx` |
| Apply UI (internal name) | `ControlPanelUpdate.tsx` |
| Section ids | `lib/control-panel-types.ts` |
| Loader | `lib/load-control-panel-data.ts` |
| Visible SNAPSHOT MENU | `lib/visible-snapshot-menu.ts` |
| MTAE protocol | `lib/mtae-brief.ts`, `lib/mtae-snapshot.ts` |
| MAF protocol | `lib/maf-brief.ts` |
| Forensic item | `lib/snapshot-trade-packages.ts` → `tradeForensicSnapshotItem` |

---

## Related

- [mtae-technical-analysis-engine.md](mtae-technical-analysis-engine.md)
- [maf-matrix-attribution-framework.md](maf-matrix-attribution-framework.md)
- [snapshot-catalog.md](snapshot-catalog.md)
- [runtime-truth.md](runtime-truth.md)
- [snapshot-label-fix-25-08.md](snapshot-label-fix-25-08.md) — Prompt 25-08 label + legacy trade contract
