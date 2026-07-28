# CHANGE 24-49 — Validate and finish consolidation PR #113

**Status:** Pending (same PR #113)  
**Parent:** 24-47

## Scope

Validate mobile behavior, fix defects only, document runtime truth. No redesign.

## Fixes in this pass

- RepositoryView child Realm/Deck create: provisional titles (no blocking prompt)
- `persistChaosDumpCapture` injectable deps for asset-failure tests
- Stronger transaction failure tests (no Fragment on failure; orphan cleanup)
- Level snapshot includes **Blocks** count (actionable → sort by fragments)
- Deck grid: 1 column below 380px, 2 columns when width allows
- Contrast: placeholders/metadata on Deck/Builder operational copy
- Docs: hierarchy, mode graph, Fullscreen role, PR order, Pending only

## Remaining prompts (acceptable)

| Prompt | Context | OK? |
|--------|---------|-----|
| Rename Realm / Folder / Deck / Fragment | ••• rename | Yes — not creation |
| Vault prep optional note | Deck prepare | Yes — confirmation context |
| Delete confirms | Destructive | Yes |

## Manual iPhone

See PR #113 checklist — mark only after device verification. Agent environment cannot run Safari iPhone; automated + code audit completed.

## Open PR order

1. Merge #113 when manual checks pass  
2. Close #108, #112 as superseded  
3. Rebase #110 onto main → validate → merge separately
