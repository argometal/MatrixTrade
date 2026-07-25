# Control sanity — Prompt IDs + aggregate snapshots

**Originating Prompt ID:** 24-30  
**Date:** 2026-07-25  
**Branch:** `cursor/control-sanity-24-30-b0a5`

## Summary

Two isolated Control-sanity changes:

1. **Prompt ID Protocol** added to the canonical Matrix Mechanics brief/snapshot (traceability only).
2. **Snapshot general** — a read-only first button at each applicable snapshot-menu level that concatenates known child snapshot texts without mutating them.

## Exact files changed

| File | Change |
|------|--------|
| `lib/matrix-mechanics-brief.ts` | Compact PROMPT ID PROTOCOL section |
| `lib/matrix-mechanics-snapshot.ts` | `MATRIX_MECHANICS_REVISION` → 29 |
| `lib/snapshot-aggregate.ts` | **New** — pure aggregate helpers |
| `app/components/control-panel/MatrixControlPanel.tsx` | First button = Snapshot general per Control detail level |
| `app/components/preview/SnapshotButton.tsx` | Dropdown menus prepend Snapshot general |
| `tools/test-control-sanity-snapshots.ts` | **New** tests |
| `package.json` | `test:control-sanity-snapshots` |
| `md/matrix/control-sanity-aggregate-snapshots.md` | This record |

## Hierarchy behavior

Applicable Control detail levels:

| Level | Aggregate sources |
|-------|-------------------|
| MTA Mechanics (`train-ai`) | PlainCopy: Mechanics brief + Apply schema contract |
| Technical Analysis (`mtae`) | PlainCopy: MTAE protocol + filtered TF-map snapshot items |
| Playbook | Filtered playbook snapshot items (Mechanics row excluded as before) |
| Stock File (per ticker) | That ticker’s snapshot items (Mechanics row excluded as before) |
| Scout Desk | Scout desk snapshot items |
| Learning | PlainCopy: MAF protocol (+ any learning snapshot items) |

Also: `SnapshotButton` menus (Playbook / Trades / etc.) prepend Snapshot general from their `items` prop.

Rules:

1. First button = **Snapshot general**.
2. Remaining buttons unchanged (same labels, same child texts).
3. Aggregate uses eligible descendants in stable list order.
4. Items with id `snapshot-general…` are **excluded** from collection (no self-inclusion, no nested aggregate duplication).
5. Independent child snapshots remain the canonical modular sources.

## Read-only guarantees

`lib/snapshot-aggregate.ts` only:

- reads `SnapshotMenuItem[]` already built by existing builders / PlainCopy texts;
- concatenates `item.text` with section headers;
- returns a new in-memory `SnapshotMenuItem` for clipboard copy.

It does **not**:

- edit child snapshots;
- create persistent records;
- generate analysis or invent knowledge;
- call Apply / Accept;
- write to the database or storage modules;
- alter Stock Files, Scouts, Trades, MAF, or MTAE;
- replace child buttons.

Copy path remains the existing `copyText` / clipboard path.

## Tests run

```text
npm run test:control-sanity-snapshots
npx tsc --noEmit
```

(Plus existing snapshot-related suites as available.)

## Explicit non-goals

- Control Index redesign
- Renaming/removing existing snapshot buttons
- Apply validation / persistence / trading mechanics changes
- Second handwritten aggregate body that can drift from children
- Schema frameworks, Zod, new block types

## Remaining limitations

- Aggregate reflects the **currently loaded** in-memory snapshot texts for that menu level only.
- Library pick screen has no snapshot buttons — no Library-root aggregate.
- Stock File picker lists tickers; aggregate appears after a ticker is selected (detail level).

## Final verdict

**IMPLEMENTATION COMPLETE — READY FOR REVIEW**
