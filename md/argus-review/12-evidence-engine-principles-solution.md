# 12 — Sealed principles + solution (Evidence Engine)

**Status:** Sealed direction — solution for refinement (not a new engine)  
**Date:** 2026-08-06  
**Depends on:** [`11-behavioral-evaluation-review.md`](11-behavioral-evaluation-review.md)  
**Canonical:** `main` → `md/argus-review/12-evidence-engine-principles-solution.md`

---

## Answer

**Yes.** The six principles below are sufficient to drive a concrete solution.

They match what the implementation already is at its best (evidence + links + derived views) and reject what has drifted (parallel scores, opaque numbers, orphan metric UIs).

**Solution thesis:** Argus stays an **Evidence Engine**. Behavior is answered by **queries over evidence**, not by expanding a stored behavioral layer.

No new behavioral ontology. No new score types. Prefer delete and unify.

---

## Sealed principles

### P1 — Evidence is permanent

Only persist what the user explicitly records:

* Evidence (logs, inbox, attachments)
* Tags (on evidence)
* Links
* Dates
* Entities
* Topics
* Decisions (when recorded as evidence / runbook progress — not inferred scores)

Everything else must be **derivable**.

### P2 — Derived, not stored

Do not persist behavioral metrics as database fields.

Compute on read from evidence, e.g.:

* recurring marks (Patterns)
* neglected relationships (from last interaction + follow-ups + user value marks)
* dominant / repeating topics (from evidence tags + topic binders)
* triage debt (counts)

### P3 — One question, one computation

One user question → one computation (and one vocabulary).

Forbidden pattern: several metrics answering the same question.

### P4 — Vocabulary over scoring

Prefer explainable states over opaque numbers.

### P5 — Never measure for the sake of measuring

Every indicator must pass: *If this disappeared tomorrow, would a decision get worse?*

### P6 — Intelligence belongs to retrieval

Product surfaces answer retrieval questions (“show recurring…”, “show neglected…”) — not dashboards of stored behavioral scores.

**Emulate Git:** immutable facts; insights derived later.

---

## Solution (map principles → current code)

### Keep (already Evidence-Engine aligned)

| Keep | Why (principle) | Where |
|------|-----------------|-------|
| Evidence Tags on logs/inbox | P1 permanent | `Log.topics`, `InboxItem.topics` |
| Tag Patterns (derived recurrence) | P2, P3 “what keeps repeating?” | `buildTagPatternsForScope` |
| Topic Aliases | vocabulary for retrieval/match, not a score | Topic `linkedTags` |
| Event Signals as marks | permanent only as user marks; become Tags on chronicle Save | Event `linkedTags` → `Log.topics` on Save |
| contactValue / follow-up dates | user-recorded inputs for neglect queries | `Entity.contactValue`, `Log.followUpDate` |
| Nav triage counts | retrieval of debt, not behavioral scores | `buildV2NavCounts` (rename away from “signals” in copy/code over time) |
| Evidence/link count pills | structural retrieval | topic/event/project loaders |
| Home viz evidence volume / patterns | retrieval aids | `intelligence-viz.ts` |

### One question → one computation (P3)

| User question | Single computation to keep | Remove or demote (do not answer the same question again) |
|---------------|----------------------------|----------------------------------------------------------|
| **Who needs attention?** | One derived **status vocabulary** + optional sort key from the same inputs (last interaction, open follow-ups, contactValue weight, lifecycle) | Parallel live meanings of `attentionScore` **and** `relationshipHealth` **and** browse `strength%` **and** `V2NetworkBrowseStatus` **and** `DerivedRelationshipAttention` as separate products |
| **What keeps recurring in evidence?** | `TagPattern` only | Do not add score fields for “recurring mistakes/successes” — use Tags the user already applies |
| **What needs triage?** | Nav/action counts only | Do not call these Event Signals |
| **What is this binder about?** | Topic entity + evidence in scope | Do not treat Aliases as Patterns |

**Target Network UX (refinement, not redesign):**

* One status enum shown to users (recommend browse-facing states already close to P4: e.g. Active / Dormant / Lost / Archived / New — exact labels = implementation pass, not a new model).
* At most one numeric sort aid, and only if a status alone cannot order a list; prefer none (P4).

### Delete / stop writing (P2, P5)

| Action | Principle | Evidence from review |
|--------|-----------|----------------------|
| Remove or remount **orphan** metric UIs/builders (`buildNetworkHomeSections`, unused `JournalHome` summary path, `buildEntityNetworkViews`, `NetworkRelationshipMetricsDisplay`) | P5 | No page mounts |
| Stop **writing** `strategicValue` as an active metric; read-fallback only until unused | P1/P2 | `@deprecated` but still persisted/shown |
| Drop org **relationshipScore / Trust / Future Potential** heuristics **or** replace display with the single Network status query for related people | P3/P5 | Display-only; fake precision |
| Reduce/remove opaque **`outcomeScore` regex** (`OUTCOME_SIGNALS`) as a silent driver of attention | P4/P5 | Not explainable; not user-recorded |
| Do not persist Patterns, health, attention, strength | P2 | Already derived-on-read — keep it that way |

### Clarify without new systems (P1, P6)

| Clarification | Implementation note |
|---------------|---------------------|
| Event Signals ≠ Patterns until on evidence | Already true in code; UX copy must say so |
| Topic Patterns use topic-scoped evidence | Already true; optional later: widen **query** scope to linked-event evidence (still derived, still P2) — **not** a new metric type |
| `linkedTags` storage overload | Keep vocabulary separation in UI; no new tables required for this solution |
| Inbox follow-up vs log follow-up (README weakness #5) | Either include inbox follow-ups in the **same** “needs attention” query, or document permanent exclusion — do not invent a second attention metric |

### Explicitly do **not** build

* A Behavior Engine module or stored behavioral profile  
* New score types (mistakeScore, successScore, trendIndex, …)  
* Flag as a first-class entity  
* CRM-style dashboard of KPIs  
* AI-inferred persistent traits  

Recurring mistakes/successes = **Tags + Patterns + retrieval**, if the user marks them.

---

## Implementation phases (solution order)

### Phase A — Seal the surface (no behavior change for users who never saw orphans)

1. Delete unused metric builders/components **or** remount one intentionally (prefer delete).  
2. UI/docs: Event Signals → Patterns only after Save; nav badges are triage, not Signals.  
3. Point `00-PUBLIC-STATUS` / help at these sealed principles.

### Phase B — One “Who needs attention?” query

1. Pick one user-facing status vocabulary for Network browse + contact.  
2. Drive it from: evidence dates, follow-ups, contactValue weight, lifecycle/archive.  
3. Stop exposing parallel health/attention/strength as competing truths.  
4. Retire `strategicValue` write path; migrate display off it.

### Phase C — Kill opaque and decorative scores

1. Remove or neutralize `outcomeScore` regex influence.  
2. Remove org decorative relationshipScore/Trust/Future (or replace with Phase B status).  
3. Confirm nothing new is persisted for “behavior.”

### Phase D — Retrieval questions (product copy + filters only)

Ship/reinforce retrieval phrasing, not new metrics:

* Show recurring tags (Patterns)  
* Show neglected commitments (Phase B query)  
* Show triage debt (nav counts)  
* Show topic/event evidence (existing scopes)  

Optional: topic Pattern **query** includes linked-event evidence (derived read widening) — only if product confirms; still P2.

---

## Acceptance tests (principle-gated)

A change is **in** only if:

1. It does not add a persisted behavioral field.  
2. It does not add a second computation for an existing question.  
3. Any remaining indicator is explainable from evidence the user can open.  
4. Removing it would clearly worsen a named decision (P5).  
5. It does not expand beyond Evidence Engine scope.

---

## Relation to prior review

| Document | Role |
|----------|------|
| `11-behavioral-evaluation-review.md` | Inventory + critique of what exists |
| **This file (`12`)** | Sealed principles + ordered solution |

P0–P2 in `11` remain valid; this file **constrains** them so solutions stay inside the Evidence Engine.

---

## Bottom line

These principles are **good enough**.

**Solution:** treat Argus as Git-like evidence storage; collapse relationship “behavior” to **one derived attention/status query**; keep **Tags → Patterns** as the only recurrence system; delete orphans and opaque scores; never grow a Behavior Engine.
