# Control panel IA

**Status:** Canonical (2026-07-21).  
**Parent:** [snapshot-catalog.md](snapshot-catalog.md) · [external-ai-policy.md](external-ai-policy.md) · [mtae-technical-analysis-engine.md](mtae-technical-analysis-engine.md)

---

## Purpose

**Control** is the global write + context-copy drawer:

| Entry | Job |
|-------|-----|
| **Update** | Paste AI Block → Validate → Accept |
| **Mechanics brief** | Copy Matrix rules once for a new AI chat |
| **Technical analysis** | MTAE protocol + TF role maps — charts → `technical-assessment` (no capital) |
| **Playbook** | Copy method rules / checklists / stats |
| **Stock file** | Pick one ticker → MTAE request for ticker + thesis/scouts |
| **Scout desk** | Copy desk overview + risk room (not a second Mechanics button) |

Window packages (Scout desk overview, Stock file, etc.) already **prefix** the Mechanics brief in the copied text. Do not add a second “Matrix Mechanics snapshot” row under Scout desk — that duplicates Control → Mechanics brief.

**MTAE is not Playbook and not Mechanics.** See [mtae-technical-analysis-engine.md](mtae-technical-analysis-engine.md).

---

## Process order (copy)

```text
1. Mechanics brief          (once per chat)
2. Technical analysis       (MTAE protocol + optional TF map)
3. Charts → AI → technical-assessment
4. Update → Accept          (patches Stock file)
5. Stock file / Scout desk  (capital / execution next)
```

---

## Naming rule (non-negotiable)

Labels must **name the payload** the human copies or the action they take.

| Allowed | Forbidden (examples of past mistakes) |
|---------|----------------------------------------|
| Mechanics brief | Session, Train session, AI session |
| Technical analysis | Analysis (too vague), Chart AI, MTAE alone without “Technical” |
| Playbook | Method (ambiguous), Policies (vague) |
| Stock file | Case (ambiguous vs legal/support case) |
| Scout desk | Scouting (ok only if desk is clear) |
| Update | Import, Connect (legacy) |

**Do not rename for “simplicity”** if the new word is vaguer than the old one.

Folding Playbook or MTAE under Mechanics brief is forbidden — each is its own Control section.

---

## Forensic export — trade only

`{ID} forensic` (legacy gaps, R, review, post-stop) ships **only** on:

- Route: `/trades/{ID}`
- UI: Trade snapshot menu when `status === closed`

**Forbidden:**

- Control home section “Closed trade” / “Trade” / forensic picker
- Loading all closed-trade forensics into Control panel data
- Asking the AI (via mechanics brief) to request Control → Closed trade

Rationale: Trades is the histórico; Scout is the war room; Control is context + Update. A second closed-trade browser in Control duplicates Trades and confuses IA.

---

## Agent / PR checklist

Before merging Control UI or mechanics copy changes:

1. Section labels still match the table above (descriptive).
2. No new peer under Control that belongs to Trades, Scout, or History (MTAE / Technical analysis is allowed).
3. Forensic still only on trade detail.
4. `md/matrix/snapshot-catalog.md` updated if snapshot homes change.
5. Bump `MATRIX_MECHANICS_REVISION` when brief/snapshot text changes.

---

## Code map

| Piece | Location |
|-------|----------|
| Control UI | `app/components/control-panel/MatrixControlPanel.tsx` |
| Section ids | `lib/control-panel-types.ts` |
| Loader | `lib/load-control-panel-data.ts` |
| MTAE protocol copy | `lib/mtae-brief.ts`, `lib/mtae-snapshot.ts` |
| Forensic item | `lib/snapshot-trade-packages.ts` → `tradeForensicSnapshotItem` |
| Trade page | `app/(trading)/(nav)/trades/[id]/page.tsx` |

---

## Related

- [mtae-technical-analysis-engine.md](mtae-technical-analysis-engine.md)
- [snapshot-catalog.md](snapshot-catalog.md)
- [external-ai-policy.md](external-ai-policy.md)
- [scout-execution-model.md](scout-execution-model.md)
