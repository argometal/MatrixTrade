# 13 — Evidence Engine implementation notes

**Status:** Implemented — canonical on `main` after merge of this pack  
**Date:** 2026-08-06  
**Depends on:** [`12-evidence-engine-principles-solution.md`](12-evidence-engine-principles-solution.md)  
**Living mechanics (Argus library):** [`../argus/evidence-engine-mechanics.md`](../argus/evidence-engine-mechanics.md)  
**Deprecated handoffs:** [`../argus/DEPRECATED-HANDOFFS.md`](../argus/DEPRECATED-HANDOFFS.md)

---

## What shipped (phases A–D)

### Phase A — Seal the surface

* Deleted unused metric UIs: `NetworkEntityCard` / `NetworkHomeSections`, `NetworkRelationshipMetricsDisplay`, `JournalHome`, `HomeNetworkCard`
* Removed dead builders: `buildNetworkHomeSections`, `buildHomeNetworkSummaries`, `buildEntityNetworkViews`
* Event Signals copy clarifies: Patterns count Tags on evidence after chronicle Save
* Nav badge comments/help: triage debt ≠ Event Signals

### Phase B — One “Who needs attention?” query

* User-facing Network status vocabulary: **New / Active / Dormant / Lost / Archived** (`deriveNetworkStatus`)
* Contact Attention panel and org overview use that vocabulary
* Removed competing **strength%** from Network browse cards/list/sidebar
* Smart views use evidence volume / shared projects instead of strength thresholds
* `strategicValue` omitted from entity update patches (create still defaults for schema; read-fallback via `contactValueWeight` only)

### Phase C — Opaque / decorative scores

* `OUTCOME_SIGNALS` regex scoring removed; `outcomeScore` always `0` (deprecated field retained for compile stability)
* `attentionScore` no longer uses outcome regex — sort aid from dates / follow-ups / contactValue weight only
* Org **relationshipScore / Trust / Future Potential** replaced with status + evidence facts (last interaction, follow-ups, people, evidence count)

### Phase D — Retrieval copy

* Help: Network / badges / Patterns wording aligned with Evidence Engine
* AI network snapshots: status + evidence counts, no strength/outcome KPIs
* Library: `evidence-engine-mechanics.md` + `DEPRECATED-HANDOFFS.md`

---

## Explicitly not built

* Behavior Engine / new score types / Flag entity
* Topic Pattern query widening to linked-event evidence (optional later; still P2)

---

## Acceptance (principle-gated)

1. No new persisted behavioral fields  
2. One Network status vocabulary for browse + contact + org  
3. Remaining indicators explainable from evidence the user can open  
4. Orphan score UIs deleted  
