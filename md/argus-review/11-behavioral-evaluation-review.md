# 11 — Behavioral evaluation model review

**Status:** **Historical inventory** (2026-08-06) — describes pre-implementation state  
**Canonical path:** `main` → `md/argus-review/11-behavioral-evaluation-review.md`  
**Superseded as runtime truth by:** [`12-evidence-engine-principles-solution.md`](12-evidence-engine-principles-solution.md) · [`13-evidence-engine-implementation.md`](13-evidence-engine-implementation.md) · [`../argus/evidence-engine-mechanics.md`](../argus/evidence-engine-mechanics.md)

> **Do not treat this file as current architecture.** It was the audit that motivated the Evidence Engine solution. Sections below that say “still written / strength% / outcomeScore live / orphan UIs” refer to the codebase **before** phases A–D. For what ships now, read `12` → `13` → `evidence-engine-mechanics.md`.

**Original objective:** Refine the existing behavioral evaluation model. Not an architecture redesign. Not a new behavioral system.

**Method:** Read `md/argus-review/00`–`10`, then inspected `lib/argus/**` and `app/argus/**`. Implementation is the source of truth for what exists; docs are cited for intent.

**Constraint language used below:**

| Label | Meaning |
|-------|---------|
| Documented | Stated in `md/` |
| Implemented | Code path exists and is reachable from a mounted UI or API |
| Partially implemented | Type/UI/helper exists but incomplete wiring |
| Unused | Defined/exported but no mounting callers found |
| Contradicts docs | Implementation conflicts with a documented rule |

---

## 1. Executive finding

Argus does **not** have one centralized “behavioral evaluation engine.” It has **several parallel derived-indicator families** that share evidence (`Log` / `InboxItem`) but answer different questions with different formulas, vocabularies, and UI surfaces.

The highest-cost problem is not missing metrics. It is **overlapping relationship-state languages** and **one overloaded field** (`Entity.linkedTags`) used for Aliases, Event Signals, and manual tags — plus **orphaned network-home metric UIs** that still carry scoring code.

Simplification should prefer: consolidate status vocabularies, retire unused scorers/UI, keep evidence Tags → Patterns as the only recurrence detector, and keep Aliases/Signals as vocabulary (not scores) unless chronicle Save puts Signals onto evidence.

---

## 2. Dependency map (behavioral information flow)

```text
PERSISTED INPUTS
├─ Entity.contactValue[] / myValue[] / strategicValue (legacy)
├─ Entity.linkedTags[]     ← overloaded: Topic Aliases | Event Signals | project/person tags
├─ Entity.alias            ← display subtitle (not Topic Alias)
├─ Log.topics[]            ← evidence Tags
├─ InboxItem.topics[]      ← evidence Tags
├─ Log.entityIds[] / InboxItem.linkedEntityIds[]  ← attribution
├─ Log.followUpDate / kind follow_up
└─ Entity.lifecycleStatus / deletedAt

DERIVED ON READ (not stored as scores)
├─ buildEntityIntelligence (network-intelligence.ts)
│     contactValueWeight → relationshipHealth → attentionScore
│     outcomeScore ← regex OUTCOME_SIGNALS on log text/topics
│     daysSinceLast / openFollowUps / topics from logs
│     └─ deriveRelationshipAttention (network-relationship-metrics.ts)
│           status: healthy | needs_attention | dormant | archived
│
├─ computeRelationshipStrength (network-browse-utils.ts)  → strength % 0–100
│     └─ deriveNetworkStatus → New|Active|Dormant|Lost|Archived
│
├─ buildTagPatternsForScope (tag-patterns.ts)
│     evidence tags only → TagPattern[] (count≥3, recent in 90d)
│
├─ buildTopicSignalIndex (topic-signals.ts)
│     topic name parts + Aliases + observed log tags → inbox suggestion rank
│
├─ buildV2KnowledgeNodes (intelligence-viz.ts)
│     evidenceCount, recencyScore, recurrence30d, tagPatterns
│
├─ buildV2NavCounts (loaders.ts)
│     inbox / network follow-ups / needs_classification  (NOT Event Signals)
│
├─ Org relationshipScore / relationshipMetrics (loaders.ts)  ← uses strategicValue
└─ Ops getArgusHealthReport (health/status.ts)  ← storage health, not CRM

ORPHAN / UNUSED PATHS (defined; no page mount found)
├─ buildNetworkHomeSections + NetworkHomeSections UI
├─ buildHomeNetworkSummaries + JournalHome mount path
├─ buildEntityNetworkViews
└─ NetworkRelationshipMetricsDisplay (component export only)
```

---

## 3. Complete inventory

### 3.1 Persisted user marks (not scores)

| Concept | Storage | Defined | Updated | Consumed | Displayed | Affects future decisions? |
|---------|---------|---------|---------|----------|-----------|---------------------------|
| **Evidence Tag** | `Log.topics[]`, `InboxItem.topics[]` | `types.ts` | Capture / triage / chronicle Save | Patterns, intel topics, Deliver filters | Tag pickers, clouds, badges | Yes — Patterns, filters, opportunity regex on topics |
| **Topic Alias** | Topic `Entity.linkedTags` | `vocabulary-policy.md`, `TOPIC_ALIASES` | `updateTopicAliasesAction` | `buildTopicSignalIndex`, search text | Topic Aliases tab | Yes — inbox entity suggestions |
| **Focus Tag (Signal)** | Journal `ArgusData.signalTags` | `SIGNAL_TAGS` copy | `updateSignalTagsAction` / `toggleSignalTagAction` — not stamped onto Notes | Highlight when Pattern matches | Home → Tags · pattern/cloud highlight | Indirect — watchlist only; Patterns still from evidence Tags |
| **Entity.alias** | `Entity.alias` string | `types.ts` | Entity edit | Display / search | Subtitles | Display/search only |
| **contactValue** | `Entity.contactValue[]` | `network-relationship-metrics.ts` | Entity update / AI apply | `contactValueWeight` → health/attention | Contact metrics UI | Yes — grace windows |
| **myValue** | `Entity.myValue[]` | same | same | Display / AI context | Contact metrics UI | No scoring use found |
| **strategicValue** | `Entity.strategicValue` 1–5 | `types.ts` | Still written on update | Fallback weight; org score | NetworkEntityCard; org | Yes when contactValue empty; org display |
| **Follow-up date** | `Log.followUpDate` / kind | `types.ts` | Journal/inbox | Attention, nav network badge | Cards / contact | Yes |

### 3.2 Derived relationship indicators

| Name | Compute | Update | Consume / display | Decision effect | Notes |
|------|---------|--------|-------------------|-----------------|-------|
| `outcomeScore` | `computeOutcomeScore` regex `OUTCOME_SIGNALS` | on-read | attentionScore; org Collaboration; NetworkEntityCard | Sort / score input | Not user Tags; hidden heuristic |
| `relationshipHealth` | `computeRelationshipHealth` | on-read | attention; browse status; org labels | Filters/status | Enum: active/cooling/dormant/neglected |
| `attentionScore` | `computeAttentionScore` | on-read | sort network lists / cards | Sort only | |
| `DerivedRelationshipAttention` | `deriveRelationshipAttention` | on-read | contact shell; AI snapshot | Display/AI | Different enum than health |
| `strength` % | `computeRelationshipStrength` | on-read | network browse bar; smart views ≥60/≥70 | Filter smart views | Different formula from attention |
| `V2NetworkBrowseStatus` | `deriveNetworkStatus` | on-read | browse cards / smart views | Filter | Third status vocabulary |
| Org `relationshipScore` | `sv + 0.3` clamp | on-read | V2OrgShell | Display only | Uses legacy strategicValue |
| Org Engagement/Collaboration/Trust/Future | `buildRelationshipMetrics` | on-read | V2OrgShell | Display only | Heuristic labels |

### 3.3 Evidence recurrence / intelligence viz

| Name | Compute | Decision effect |
|------|---------|-----------------|
| `TagPattern` / `patternCount` | `buildTagPatternsForScope` | Topics filter tab `patterns`; visual badges; treemap stroke |
| `recencyScore` / `recurrence30d` | `intelligence-viz.ts` | Home portfolio axes (viz only) |
| `evidenceCount` / `recentCount` (viz) | count evidence in scope | Node sort / treemap size |
| Topic volume incl. events | `countEvidenceForTopicIncludingEvents` | Viz volume only — **Patterns stay topic-direct** (doc/code conflict with user expectation) |

### 3.4 Action badges (named “signals” in nav code)

| Name | Compute | Meaning |
|------|---------|---------|
| `V2NavCounts.inbox` | pending\|linked count | Triage debt |
| `V2NavCounts.network` | follow-ups in [−30d, +3d] | Follow-up window |
| `V2NavCounts.topics` | `needs_classification` logs | **Not** Topic entities |

Documented: nav badges are **not** Event Signals (`vocabulary-policy.md`).

### 3.5 Matching / suggestion scores

| Name | Compute | Decision effect |
|------|---------|-----------------|
| `EntityMatchScore` | `scoreEntityAgainstContext` / `rankInboxEntitySuggestions` | Ranks inbox link suggestions |

### 3.6 Counts that look like “metrics” but are structural

Topic/Event/Project metric pills (Notes, Email, Attachments, Orgs, Projects, People, attendees, etc.) — evidence/link **counts**, not behavioral scores. Implemented in topic/event/project loaders. Decision effect: navigation/scan only.

### 3.7 Unused / orphan paths

| Symbol | Finding |
|--------|---------|
| `buildNetworkHomeSections` + `NetworkHomeSections` | Exported; **no page import/mount found** |
| `buildHomeNetworkSummaries` + `JournalHome` | Builder/UI exist; **no mount callers found** for builder |
| `buildEntityNetworkViews` | Exported; **no app callers found** |
| `NetworkRelationshipMetricsDisplay` | Component file; **no import callers found** |
| `Entity.relationshipStatus` / `relationshipReason` | `@deprecated` type fields; not written by `updateEntity` |
| Viz `strategicValue?` / `completion?` on nodes | `@deprecated`; not set by `buildV2KnowledgeNodes` |

### 3.8 Ops health (out of behavioral scope but name collision)

`getArgusHealthReport` / `HealthLevel` — storage/subsystem health for Diagnostics. **Not** `relationshipHealth`.

---

## 4. Critical evaluation (by family)

Challenge used: *If this disappeared tomorrow, what decision becomes worse?*

### 4.1 Evidence Tags → Patterns — **keep (core)**

| Criterion | Assessment |
|-----------|------------|
| Objective from evidence? | Yes — count of identical tags on scoped evidence |
| Two reviewers same result? | Yes, given same scope and thresholds (3 / 90d) |
| Influences decisions? | Yes — pattern filter, visual alert, Deliver tag filters |
| Insight vs number? | Recurrence insight (“this mark keeps appearing”) |
| Maintenance justified? | Yes — small pure function |
| If removed? | Lose only recurrence detector tied to user marks |

**Verdict:** Central behavioral signal of the evidence model. Do not replace. Refine scope questions (topic↔event rollup) separately without inventing a new pattern system.

### 4.2 Topic Aliases — **keep (vocabulary, not score)**

| Criterion | Assessment |
|-----------|------------|
| Objective? | User-defined synonyms — subjective by design |
| Decision effect? | Improves inbox suggestion recall |
| If removed? | Worse matching of emails/search to Topics |

**Verdict:** Not a metric. Keep separated from Patterns (documented and implemented).

### 4.3 Event Signals — **keep as marks; clarify pipeline**

| Criterion | Assessment |
|-----------|------------|
| Objective as score? | No — user markers |
| Becomes measurable? | Only after chronicle Save copies to `Log.topics` |
| If removed? | Lose event-local vocabulary; Patterns still work from evidence Tags |

**Verdict:** Implementation already defines the path to Patterns (copy on Save). Gap is **expectation vs scope** (topic metrics ignore event-only evidence), not missing signal math. Refinement ≠ new ontology.

### 4.4 contactValue → grace / health / attention — **keep with caution**

| Criterion | Assessment |
|-----------|------------|
| Objective? | Partially — user-chosen multi-select; weight = list length |
| Two reviewers? | Same if same contactValue filled |
| Decision effect? | Yes — health windows and attention sort |
| If removed? | Lose prioritization of who is overdue relative to value |

**Verdict:** Useful for Network decisions. `myValue` does not affect score — either wire intentionally later or stop presenting it as peer to contactValue in “metrics” framing (display-only is fine if labeled as such).

### 4.5 strategicValue (legacy 1–5) — **retire from decision path**

| Criterion | Assessment |
|-----------|------------|
| Deprecated in types? | Yes `@deprecated` |
| Still written? | Yes |
| Still drives org relationshipScore and fallback weight? | Yes |
| If removed from decisions? | Prefer contactValue-only; org score would need to stop using legacy |

**Verdict:** Duplicates contactValueWeight. High simplification value: stop writing/displaying as active metric; keep read fallback only until data migrated.

### 4.6 outcomeScore (regex OUTCOME_SIGNALS) — **weak objectivity**

| Criterion | Assessment |
|-----------|------------|
| Objective from evidence? | Text match on title/body/topics — brittle |
| Two reviewers same? | Same code → same number; **semantic** agreement low (wording variance) |
| Influences decisions? | Feeds attentionScore and org Collaboration |
| Insight? | Opaque; user cannot see why points accrued |
| If removed? | Attention sort changes; no explicit user decision UI depends on seeing outcomeScore |

**Verdict:** High ambiguity / low explainability. Prefer reducing its weight or restricting to user Tags that already encode outcomes — without inventing a new score type.

### 4.7 Triple status vocabulary — **consolidate**

Present enums:

1. `relationshipHealth`: active | cooling | dormant | neglected  
2. `DerivedRelationshipAttention.status`: healthy | needs_attention | dormant | archived  
3. `V2NetworkBrowseStatus`: New | Active | Dormant | Lost | Archived  

| Criterion | Assessment |
|-----------|------------|
| Same behavioral question? | Largely “is this relationship OK / overdue / dead?” |
| Overlap? | High |
| Maintenance cost? | Three mappings, three UIs |

**Verdict:** Highest ROI simplification inside current architecture: pick **one** user-facing status vocabulary driven from shared inputs (last interaction, follow-ups, lifecycle, contactValue weight). Keep other enums only as internal adapters if needed — or delete unused display paths.

### 4.8 attentionScore vs browse strength % — **duplicate “how important is this contact?”**

| | attentionScore | strength % |
|--|----------------|------------|
| Inputs | value, silence, follow-ups, outcome, health | emails, logs, projects, events, recency buckets |
| Use | sort | smart-view thresholds |

**Verdict:** Two answers to “priority / strength.” Refinement: choose one ranking for Network browse+sort, or clearly separate labels (“Attention due” vs “Evidence volume”) in UI so they are not competing silent scores.

### 4.9 Org relationshipScore / Trust / Future Potential — **display heuristics**

| Criterion | Assessment |
|-----------|------------|
| Objective? | Weak (strategicValue+0.3; word labels) |
| Decision effect? | No gates found |
| If removed? | Org header looks emptier; no pipeline change |

**Verdict:** Candidates for removal or replacement with the single shared Network status/strength already computed for people — avoid a fourth heuristic family on orgs.

### 4.10 Viz recency / recurrence / evidenceCount — **keep as retrieve aids**

Decision effect limited to Home Intelligence layout/sort. Not behavioral evaluation of people. Cost is localized. Keep unless Home Intelligence is retired.

### 4.11 Nav badges — **keep; rename in docs/UI mentally**

Useful triage counts. Naming collision with Event Signals is documented. Refinement: ensure UI copy never calls them “Signals.”

### 4.12 Orphan network home scorers — **remove or remount**

Code that sorts by attentionScore for home sections is unused if no page mounts it. Dead code raises maintenance cost and confuses reviewers into thinking more metrics are live than are.

**Verdict:** Delete unused exports/UI **or** remount deliberately. Do not leave both.

---

## 5. Signals · Tags · Aliases · Topics · Flags · Patterns · Metrics

| Concept | Intended job (docs) | Implemented job | Overlap / ambiguity |
|---------|---------------------|-----------------|---------------------|
| Topic | Evidence binder entity | Kind Topic entity + browse | Clear |
| Tag | Mark on evidence | `log/inbox.topics` | Clear as pattern input |
| Alias | Topic synonyms | Topic `linkedTags` | Clear if not called Tags |
| Signal (Event) | Event markers → Tags on Save | Event `linkedTags` + optional copy | Clear path; topic rollup expectation gap |
| Signal (nav) | — | Action badge counts | **Name collision** with Event Signals |
| Signal (OUTCOME_SIGNALS) | — | Regex for outcomeScore | **Third “signal”** meaning |
| Flag | Not a type; pattern badge ⚑ | Visual only | Docs say tags flag on recurrence |
| Pattern | Recurring evidence Tags | `buildTagPatternsForScope` | Clear |
| Behavioral metrics | Not named as one system | Network intel + browse strength + org heuristics + viz | **Fragmented** |

**linkedTags overload (implemented):** one array serves Aliases, Event Signals, and project/person manual tags. Docs separate Aliases vs Signals by entity kind; storage does not. This is redundancy of **storage shape**, not of product vocabulary — refinement can keep vocabulary and still document the shared field (already in review pack ontology).

**No Flag entity** found. No separate “behavioral summary” or “evaluation” module found (`journal-behavior.ts` is note↔log transitions only).

---

## 6. Documented vs implemented conflicts (behavioral)

| Topic | Documented | Implemented |
|-------|------------|-------------|
| Patterns only from evidence Tags | `tag-patterns-vision.md`, `tag-patterns.ts` comment | Matches |
| Aliases never Patterns | `vocabulary-policy.md` | Matches |
| Nav badges ≠ Signals | `vocabulary-policy.md` | Code still names `signals` in nav types |
| Event Signals → Patterns via Save | `vocabulary-policy.md`, chronicle action | Matches when Save creates log with topics |
| Topic metrics include linked events | User expectation / IA handoff options | Topic Patterns **exclude** event-only logs; viz volume **may include** events |
| strategicValue deprecated | `types.ts` `@deprecated` | Still persisted and shown |
| Inbox follow-up → person Attention | README weakness #5: does **not** feed | Attention uses **log** follow-ups; inbox follow-up path separate — weakness still accurate |
| Network home sections as live UX | Implied by presence of builders | **Unused** mount paths |

---

## 7. What “behavioral evaluation pipeline” actually is today

There is no single pipeline. There are four live loops:

1. **Evidence recurrence loop:** Tags → Patterns → filter/badge/viz.  
2. **Relationship attention loop:** contactValue (+ legacy strategic) + log activity + follow-ups + regex outcome → health/attention → contact/browse (and unused home sections).  
3. **Network portfolio loop:** evidence volume counts → strength % + browse status → smart views.  
4. **Triage loop:** inbox/classification/follow-up **counts** → nav badges.

Refinement should happen **inside** these loops (merge 2+3 status/rank; delete orphans; clarify 1’s topic scope), not by adding a fifth loop.

---

## 8. Recommendations (prioritized)

Prefer removal and consolidation. No new behavioral model.

### P0 — High impact, evidence-backed, reduces complexity

| # | Action | Evidence | Effect |
|---|--------|----------|--------|
| P0.1 | **Delete or remount orphans:** `buildNetworkHomeSections` / `NetworkHomeSections`, `buildHomeNetworkSummaries` / unused `JournalHome` path, `buildEntityNetworkViews`, `NetworkRelationshipMetricsDisplay` | No mount callers found | Shrinks false surface area of “metrics” |
| P0.2 | **Unify user-facing relationship status** to one vocabulary on Network browse + contact | Three enums today | One decision language |
| P0.3 | **Stop presenting strategicValue as active metric**; write path → contactValue only; keep read fallback | `@deprecated` yet still drives org score | Removes duplicate value scale |
| P0.4 | **Document in UI copy** the Event Signal rule already in code: Signals count toward Patterns only after evidence Save; topic Patterns use topic-scoped evidence | vocabulary + tag-patterns + loaders | Fixes false “metric broken” reports without new ontology |

### P1 — Medium impact refinement

| # | Action | Evidence | Effect |
|---|--------|----------|--------|
| P1.1 | Choose **one ranking** for Network (attentionScore **or** strength%), or label them as different questions in UI | Two formulas, both “priority-like” | Less contradiction |
| P1.2 | Reduce or gate `outcomeScore` regex (opaque) — prefer user Tags for outcome language | `OUTCOME_SIGNALS` private list | More reviewer-stable |
| P1.3 | Org header: drop Trust/Future/relationshipScore heuristics **or** reuse Network-derived status for linked people only | Display-only heuristics | Less fake precision |
| P1.4 | Wire **or** clearly label `myValue` as non-scoring | Not in `computeAttentionScore` | Honesty |
| P1.5 | Topic↔event Pattern scope: implement **only** the already-framed options (widen read scope / co-link on Save / UX-only) — do not invent new pattern types | IA handoff D2; loaders vs viz | Closes known gap inside current model |

### P2 — Lower priority / hygiene

| # | Action |
|---|--------|
| P2.1 | Rename code identifier `V2NavCounts` / “signals” in nav to `actionBadges` (or UI-only copy fix) to end third meaning of “signal” |
| P2.2 | Deduplicate sparkline helpers (`loaders.ts` vs `organization-browse-utils.ts`) |
| P2.3 | Remove deprecated fields from viz node types (`strategicValue?`, `completion?`) |
| P2.4 | Address README weakness #5 deliberately: inbox follow-up → attention inputs **or** document permanent exclusion |

### Explicitly out of scope (do not do as part of this refinement)

- New behavioral ontology or “evaluation engine” module  
- Replacing Tags/Patterns with AI classification  
- Schema migration to v01 as prerequisite for metric cleanup  
- Inventing Flags as a first-class entity  

---

## 9. Traceability index (primary sources)

| Area | Path |
|------|------|
| Review pack | `md/argus-review/00`–`10` |
| Vocabulary | `md/argus/vocabulary-policy.md` |
| Pattern vision | `md/argus/tag-patterns-vision.md` |
| Pattern code | `lib/argus/v2/tag-patterns.ts`, `lib/argus/tag-limits.ts` |
| Network intel | `lib/argus/network-intelligence.ts` |
| Contact metrics | `lib/argus/network-relationship-metrics.ts` |
| Browse strength/status | `lib/argus/v2/network-browse-utils.ts` |
| Topic signals (match) | `lib/argus/v2/topic-signals.ts` |
| Intelligence viz | `lib/argus/v2/intelligence-viz.ts` |
| Nav counts | `lib/argus/v2/loaders.ts` `buildV2NavCounts` |
| Types | `lib/argus/types.ts` |
| Focus Tag actions | `app/argus/actions.ts` (`updateSignalTagsAction`, `toggleSignalTagAction`, `appendEventChronicleEntryAction`) |
| Known weaknesses | `md/argus/README.md` |

---

## 10. Bottom line

The current behavioral model **can** answer the useful questions it already asks — recurrence of user marks, relationship neglect relative to value, triage debt, evidence volume — **by refining and deleting**, not by adding systems.

The main defects are: **overlapping status/rank metrics**, **legacy strategicValue still live**, **opaque regex outcomes**, **linkedTags overload + “signal” naming collisions**, and **orphaned metric UIs**. Address those first.
