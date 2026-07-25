# CHANGE 24-1C — Finalize architecture + Chaos builder B0

**Status:** Active implementation  
**Date:** 2026-07-25  
**PR:** MatrixTrade #76 (draft — architecture + implementation foundation)  
**Repos:** `argometal/MatrixTrade` (impl) · `argometal/Alexandria` (legacy validation runtime, not AF core)

---

## Decision

ArgusForge builds **now** with its **own model**, **contract-compatible** exchange, temporary validation via **Alexandria Legacy Adapter** (after audit), **without coupling** AF to historical Alexandria code or schema.

```text
Chaos / ArgusForge
  → neutral exchange package
  → isolated Alexandria Legacy Adapter
  → historical Alexandria execution
  → result package
  → evidence returned to ArgusForge
```

## Ownership (provisional)

| Surface | Owns |
|---------|------|
| **Chaos** | Progressive capture/construction, Decks, Fragments, text/image blocks, ordering, stable IDs, optional structural hints, local assets, neutral export prep |
| **Argus** | Organization, evidence, relations, recurrence, affinity suggestions, Realm visualization, Active/Focus/Archive, interpretation of test results |
| **Alexandria Legacy** | Temporary execution of historical spatial/Library/Viewer/Parcour/Castle/Godot/Gatekeeper workflows |
| **Alexandria Future** | Reconstructed spatial/learning motor after audit |

**Pending audit (not exclusive ownership yet):** Realm · Parcour · Castle · Locus — exchange-domain entities for now.

## This change delivers

1. Corrected architecture docs (no “Argus exclusive Parcour/Castle/Realm”, no “pipeline entirely deferred”, builder **approved**).  
2. **B0** vertical slice: ordered blocks, text edit, image + IndexedDB, stable IDs, neutral JSON export, migration, Vault compat, Legacy Adapter **boundary only**.

## Explicitly not done in 24-1C

Complete Legacy Adapter translation · ZIP binaries · Godot · Parcour/Castle engines · scheduler/SRS · final Locus ownership.
