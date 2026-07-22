# Snapshot catalog

**Status:** Canonical (2026-07-22).  
**Parent:** [external-ai-policy.md](external-ai-policy.md)

---

## UI rule

One control per window: **`{Window} snapshot ▾`**

- Title = window name  
- Subtitle = what data is included (one line)  
- Dropdown when more than one slice  

**Control** (global drawer) is separate: Matrix Mechanics · Stock Files · Apply · Library.

**Stock File primary loop (MTA-002A):** **Analyze with AI** (one package) · **Apply AI Result** (opens Control → Apply) · **Open Scout**. Slice snapshots stay under Advanced.

There is **no Request layer** in Control. Window packages may still append `=== REQUEST ===` for standalone portability; forensic does **not**.

---

## Package structure (window snapshots)

```text
=== {ENTITY} SNAPSHOT ===              ← verification bookend (start)
1. MATRIX MECHANICS (brief prefix)     ← automatic unless mechanics-only / forensic
2. [window data]
3. === REQUEST ===                     ← allowed block types (most windows; not forensic)
=== END {ENTITY} SNAPSHOT ===          ← verification bookend (end)
```

**Matrix Mechanics Snapshot** (System / dropdown) = full constitution — paste once per AI session.  
Primary Control copy of Mechanics = brief (no REQUEST).

---

## Catalog

| Window | Menu label | Data slice | Notes |
|--------|------------|------------|-------|
| Dashboard | Dashboard snapshot | Budget, experiment, attention **summary**, trades overview | Global context only — do not embed inside every task paste |
| Dashboard → Needs Attention | Copy for AI (per row) | One derived task: entities, evidence, allowed blocks, completion | `lib/needs-attention-ai.ts`; references Dashboard snapshot label |
| Control → Library | Library Index | Labels for Technical Analysis / Playbook / Scout Desk / Learning | Then copy one section — `lib/library-index.ts` |
| System | Matrix Mechanics snapshot | Full rules + block catalog | |
| Playbook | Playbook snapshot | Strategies + stats | Control Library filters Mechanics row |
| Scouting Desk | Scout desk overview | All profiles + scouts + monthly room | No Mechanics row in Control |
| Stock Profile | `{TICKER}` Analyze with AI | Operative + Mechanics + MTAE + dossier + Scout | Primary Stock File action (`buildStockFileAnalyzePackage`) |
| Stock Profile | `{TICKER}` profile / linked scouts | Dossier + evidence | Advanced slice menu |
| Trade | `{ID}` this trade | Trade fields + review | |
| Trade | `{ID}` forensic | Closed trade **evidence only** (no Mechanics, no Request) | Trade window only |
| Trade | Stock profile (compact) | Linked dossier summary | |
| Trades list | Trades snapshot | All trades summary + experiment | |
| Control → Matrix Mechanics | Matrix Mechanics | Rules primer for a new AI chat | Primary |
| Control → Stock Files | `{TICKER}` MTAE request + profile / scouts | Direct access | Primary |
| Control → Apply | — | Paste → Validate → Accept | Primary write path; also opened from Stock File → Apply AI Result |
| Control → Library → Technical Analysis | MTAE protocol + TF maps | No capital | |
| Control → Library → Playbook | Playbook snapshot | No Mechanics row | |
| Control → Library → Scout Desk | Scout desk overview | | |
| Control → Library → Learning | MAF attribution protocol | Existing brief only | |

**Retired:** Control → Update (renamed Apply); Control → Closed trade; Session / Case; Request layer; folding MTAE into Mechanics; burying Stock Files under Library. See [control-panel-ia.md](control-panel-ia.md).

---

## Code map

| Piece | Location |
|-------|----------|
| Brief prefix | `buildMatrixMechanicsBrief()` |
| Full mechanics | `buildMatrixMechanicsSnapshot()` |
| Stock File Analyze | `buildStockFileAnalyzePackage()` in `lib/stock-file-analyze.ts` |
| Needs Attention task | `buildNeedsAttentionTaskSnapshot()` / `buildNeedsAttentionSnapshotText()` in `lib/needs-attention-ai.ts` |
| Library Index | `buildLibraryIndexBrief()` in `lib/library-index.ts` |
| Package builder | `buildAiContextPackage()` in `lib/ai-context.ts` |
| UI | Stock File 3-action header; Needs Attention Copy for AI; Control Apply via `openPanel({ step: "apply" })` |
| Server helpers | `lib/snapshot-packages.ts` |

---

## Related

- [thesis-ownership.md](thesis-ownership.md)  
- [ai-engineering.md](ai-engineering.md)  
