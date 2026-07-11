# Snapshot catalog

**Status:** Canonical (2026-07-11).  
**Parent:** [external-ai-policy.md](external-ai-policy.md)

---

## UI rule

One control per window: **`{Window} snapshot ▾`**

- Title = window name  
- Subtitle = what data is included (one line)  
- Dropdown when more than one slice  
- Separate control everywhere: **Connect** wizard → inline Accept  

---

## Package structure (every window snapshot)

```text
=== {ENTITY} SNAPSHOT ===              ← verification bookend (start)
1. MATRIX MECHANICS (brief prefix)     ← automatic unless mechanics-only export
2. [window data]
3. === REQUEST ===                     ← allowed block types for this window
=== END {ENTITY} SNAPSHOT ===          ← verification bookend (end)
```

Button titles lead with the entity (`NFLX · snapshot`, `H003 · NFLX snapshot`) so the user confirms the correct target before paste.

**Matrix Mechanics Snapshot** (System / dropdown) = full constitution — paste once per AI session.  
Does not replace the automatic brief prefix on data snapshots.

---

## Catalog

| Window | Menu label | Data slice | REQUEST emphasis |
|--------|------------|------------|------------------|
| Dashboard | Dashboard snapshot | Budget, experiment, attention, trades overview | trade-update, trade-close, analysis |
| System | Matrix Mechanics snapshot | Full rules + block catalog | all types |
| Playbook | Playbook snapshot | Strategies + stats | playbook-update |
| Scouting Desk | Scout desk overview | All profiles + scouts + monthly room | scouting blocks |
| Scouting Desk | This ticker | Profile + scouts + evidence | file-update, decision-update |
| Scouting Desk | This scout (PLAN) | Single plan + decision + levels | decision-update |
| Stock Profile | `{TICKER}` profile | Dossier + evidence | file-update, scout-assessment |
| Stock Profile | Linked scouts | Active PLANs for ticker | decision-update |
| Trade | `{ID}` this trade | Trade fields + review state | trade-update, trade-close |
| Trade | Stock profile (compact) | Linked dossier summary | file-update |
| Trades list | Trades snapshot | All trades summary + experiment | trade-update, trade-proposal |

---

## Code map

| Piece | Location |
|-------|----------|
| Brief prefix | `buildMatrixMechanicsBrief()` |
| Full mechanics | `buildMatrixMechanicsSnapshot()` |
| Package builder | `buildAiContextPackage()` in `lib/ai-context.ts` |
| UI | `MatrixConnectButton`, `ProposalSketchCard` |
| Server helpers | `lib/snapshot-packages.ts` |

---

## Related

- [thesis-ownership.md](thesis-ownership.md)  
- [ai-engineering.md](ai-engineering.md)  
