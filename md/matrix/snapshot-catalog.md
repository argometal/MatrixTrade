# Snapshot catalog

**Status:** Canonical (2026-08-15 · Prompt 15-12).  
**Parent:** [external-ai-policy.md](external-ai-policy.md)  
**Label fix (25-08):** [snapshot-label-fix-25-08.md](snapshot-label-fix-25-08.md) — Mechanics → Apply schema contract; no Train AI.  
**Ontology (15-12):** [control-panel-ia.md](control-panel-ia.md) · `lib/visible-snapshot-menu.ts` (single SNAPSHOT MENU source).

---

## UI rule

One control per window: **`{Window} snapshot ▾`**

- Title = window name  
- Subtitle = what data is included (one line)  
- Dropdown when more than one slice  

**Control** (global drawer) is separate: **MTA Mechanics** · Stock Files · Apply · Library.

**Stock File primary loop (MTA-002A):** **Analyze with AI** (one package) · **Apply AI Result** (opens Control → Apply) · **Open Scout**. Slice snapshots stay under Advanced.

There is **no Request layer** in Control. Window packages may still append `=== REQUEST ===` for standalone portability; forensic does **not**.

AI must ask for **exact copy-row labels** (not Library nav names). See `VISIBLE_SNAPSHOT_MENU`.

---

## Package structure (window snapshots)

```text
=== {ENTITY} SNAPSHOT ===              ← verification bookend (start)
1. MATRIX MECHANICS (brief prefix)     ← automatic unless mechanics-only / forensic
2. [window data]
3. === REQUEST ===                     ← allowed block types (most windows; not forensic)
=== END {ENTITY} SNAPSHOT ===          ← verification bookend (end)
```

**MTA Mechanics snapshot** (System / dropdown) = full constitution — paste once per AI session.  
Primary Control copy of Mechanics = brief (no REQUEST). **Apply schema contract** is a second copy row in the same drawer (not primary nav).

---

## Catalog

| Window | Menu label | Data slice | Notes |
|--------|------------|------------|-------|
| Control (home) | Dashboard snapshot | Same global context as Dashboard window | First copy row — easy access |
| Dashboard | Dashboard snapshot | Budget, experiment, attention **summary**, trades overview | Global context only — do not embed inside every task paste |
| Dashboard → Needs Attention | Copy for AI (per row) | One derived task: entities, evidence, allowed blocks, completion | `lib/needs-attention-ai.ts`; references Dashboard snapshot label |
| Control → Library | Library Index | Nav vs copy-row map | Then copy one row — `lib/library-index.ts` |
| System | MTA Mechanics snapshot | Full rules + block catalog | |
| Playbook | Playbook snapshot | Strategies + stats | Control Library filters Mechanics row |
| Scouting Desk | Scout desk overview | All profiles + scouts + monthly room | No Mechanics row in Control |
| Stock Profile | `{TICKER}` Analyze with AI | Operative + Mechanics + MTAE + dossier + Scout | Primary Stock File action (`buildStockFileAnalyzePackage`) |
| Stock Profile | `{TICKER}` profile / linked scouts | Dossier + evidence | Advanced slice menu |
| Trade | `{TICKER} · {ID} trade` | Trade fields + review | |
| Trade | `{TICKER} · {ID} forensic` | Closed trade **evidence only** (no Mechanics, no Request) | Trade window only |
| Trade | Stock profile (compact) | Linked dossier summary | |
| Trades list | Trades snapshot | All trades summary + experiment | |
| Control → MTA Mechanics | MTA Mechanics | Rules primer for a new AI chat | Primary |
| Control → MTA Mechanics | Apply schema contract | Schema-first handshake | Copy row inside Mechanics drawer |
| Control → Stock Files | `{TICKER}` MTAE request + profile / scouts | Direct access | Primary nav — not a single copy button |
| Control → Apply | — | Paste → Validate → Accept | Primary write path; also opened from Stock File → Apply AI Result |
| Control → Library → Technical Analysis | MTAE protocol + TF maps | No capital | Nav ≠ copy label |
| Control → Library → Playbook | Playbook snapshot | No Mechanics row | |
| Control → Library → Scout Desk | Scout desk overview | | |
| Control → Library → MAF | MAF attribution protocol | Protocol only — do not ask to “copy Learning” | |

**Retired:** Control → Update (renamed Apply); Control → Closed trade; Session / Case; Request layer; folding MTAE into Mechanics; burying Stock Files under Library; asking AI to copy Library nav names (Learning / Technical Analysis / …). See [control-panel-ia.md](control-panel-ia.md).

---

## Code map

| Piece | Location |
|-------|----------|
| Visible SNAPSHOT MENU | `lib/visible-snapshot-menu.ts` |
| Brief prefix | `buildMatrixMechanicsBrief()` |
| Full mechanics | `buildMatrixMechanicsSnapshot()` |
| Stock File Analyze | `buildStockFileAnalyzePackage()` in `lib/stock-file-analyze.ts` |
| Needs Attention task | `buildNeedsAttentionTaskSnapshot()` / `buildNeedsAttentionSnapshotText()` in `lib/needs-attention-ai.ts` |
| Library Index | `buildLibraryIndexBrief()` in `lib/library-index.ts` |
| Package builder | `buildAiContextPackage()` in `lib/ai-context.ts` |
| UI | Stock File 3-action header; Needs Attention Copy for AI; Control Apply via `openPanel({ step: "apply" })` |
| Server helpers | `lib/snapshot-packages.ts` |
