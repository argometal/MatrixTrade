# IA handoff — Event Signals vs Topic Aliases & metric rollup

**Status:** Proposed (awaiting IA / product confirmation)  
**Date:** 2026-08-06  
**Branch / PR:** `cursor/ia-event-topic-signals-handoff-e1a0` · https://github.com/argometal/MatrixTrade/pull/162  
**Full IA audit front door (library addresses + six-part charter):** [`ia-architecture-audit-brief.md`](ia-architecture-audit-brief.md)  
**Related:** [`vocabulary-policy.md`](vocabulary-policy.md) · [`tag-patterns-vision.md`](tag-patterns-vision.md) · [`event-chronicle-v2.md`](event-chronicle-v2.md) · [`correlation-guide.md`](correlation-guide.md)

---

## Ask from product

1. Signals / aliases created on **events** do not show up in **topic** metrics after the event is linked to the topic.
2. Review the ontology of **Topic** vs **Event** labels — should the chip editors be the same word?
3. Propose solutions; **do not ship code** until IA confirms.

---

## Current ontology (canonical today)

Both Topic and Event are `Entity` with `type: "other"` + `Kind:` in notes. Both reuse the same storage field: `Entity.linkedTags: string[]`.

| UI label | Entity | Storage | Intended role (policy) | Feeds Patterns? |
|---------|--------|---------|------------------------|-----------------|
| **Aliases** | Topic | `linkedTags` | Synonyms for inbox / search matching | **Never** |
| **Signals** | Event | `linkedTags` | User markers on the event; copied onto chronicle evidence on Save | **Only after** tags land on evidence (`log.topics` / `inbox.topics`) |
| **Tags** | Evidence only | `log.topics[]`, `inbox.topics[]` | Marks on individual items | Yes — Patterns (≥3, ≥1 in 90d) |

Source: `vocabulary-policy.md`, `ux-copy.ts` (`TOPIC_ALIASES`, `EVENT_SIGNALS`), `tag-patterns-vision.md`.

So today the **labels are intentionally different**, even though the **storage is the same**. That is not a bug by itself — it is a product vocabulary choice. Whether they *should* be the same word is an IA decision (see Decision 1 below).

---

## What the user experiences (bug / gap)

Typical path:

1. On an **Event**, open **Signals**, add chips (e.g. `gap`, `follow-up`).
2. Link that event to a **Topic** (from either side).
3. Open the Topic — expect pattern badges / metric pills / chronicle activity to reflect those signals.

**What happens:** Topic metrics and Patterns stay flat. Linking alone changes Connections / neighborhood, not the topic’s evidence-scoped counts.

---

## Why (three stacked gaps)

### Gap A — Signals ≠ countable Tags until evidence Save

Saving Signals via `updateEventSignalsAction` only writes `entity.linkedTags`.  
`buildTagPatternsForScope` counts **only** tags on logs/inbox in the passed arrays — never entity `linkedTags`.

Patterns appear on the **event** only after chronicle Save (`appendEventChronicleEntryAction`) copies Signals into the new log’s `topics`.

### Gap B — Chronicle evidence stays on the event, not the topic

Chronicle Save creates a log with `entityIds: [eventId]` only. Linked topics are **not** co-linked onto that log. Topic loaders (`getEntityHistory(topicId)`, `getLinkedInboxForEntity(topicId)`) never see those rows.

### Gap C — Structural link ≠ shared metric scope

Topic browse/detail metrics and Patterns use **direct evidence membership** (topic id on the evidence).  
Intelligence Home partially rolls up **evidence volume** from linked events (`countEvidenceForTopicIncludingEvents` in `intelligence-viz.ts`), but:

- Topic detail / browse **do not** use that rollup.
- Even there, **tag Patterns stay topic-id-only** (linked-event tags excluded).
- Discovery of “linked events” is mostly **topic → event** outbound (+ project / journal co-mention). Linking **only from the event** (topic id on `event.linkedEntityIds`) may miss intelligence rollup too — links are not mirrored.

Also: topic metric pills (Notes / Email / Attachments / Orgs / Projects / People) **do not count Events** as a dimension, even when linked in Connections.

```text
Signal chips on Event     →  entity.linkedTags
        │
        ▼ (chronicle Save only)
Tags on Event logs        →  log.topics + entityIds:[event]
        │
        ✕  no auto co-link to Topic
        ✕  topic Patterns ignore event-scoped logs
        ✕  Aliases never become Patterns (by policy)
```

---

## Should Topic and Event labels be the same?

### Argument for **keeping Aliases ≠ Signals** (current policy)

| | Topic Aliases | Event Signals |
|---|---------------|---------------|
| Job | Match incoming language (inbox / search) | Mark what happened / how to track this occurrence |
| Pattern path | Never | Via chronicle → evidence Tags |
| Mental model | “Other names for this binder” | “Markers for this moment” |

Same chip UI, different copy, reduces conflating inbox synonyms with evidence patterns.

### Argument for **unifying the label** (e.g. both “Signals” or both “Markers”)

| | |
|---|---|
| Storage | Identical field (`linkedTags`) |
| Editor | Same component (`V2VocabularyListEditor`) |
| User confusion | “I put the same chips on both; why different names / metrics?” |
| Cost | Must still explain that entity chips ≠ Patterns until on evidence |

Unifying the **word** does not by itself fix metric rollup. Ontology of *behavior* still needs Decision 2.

### Recommendation for IA (default if no preference)

Keep **Aliases** (topics) vs **Signals** (events) as labels — they encode different jobs — **and** fix rollup / co-link so the user’s linking mental model works. Optionally rename only if user testing shows the dual vocabulary is the primary confusion.

---

## Proposed solutions (pick one primary path)

### Option 1 — **Widen topic metric scope to include linked-event evidence** (recommended default)

When computing topic Patterns and evidence metrics, include logs/inbox that belong to events linked to the topic (bidirectional: topic→event **and** event→topic).

| Pros | Cons |
|------|------|
| Matches “link once, see everywhere” | Topic Patterns can inflate from event-only tags |
| Aligns topic detail with intelligence volume rollup | Must define which events count (active only? archived?) |
| No forced write amplification on Save | Chronicle on topic still may not list event rows unless stream is widened too |

**Code touchpoints (orientation only):** `topic-loaders.ts`, reuse/extend `getLinkedEventIdsForTopic` + reverse via `entitiesLinkingTo`, `buildTagPatternsForScope` inputs, optionally topic chronicle stream / browse cards.

**Sub-choice 1a:** Patterns + volume metrics.  
**Sub-choice 1b:** Volume / Notes-Email pills only; Patterns stay direct-topic-evidence (stricter binder purity).

---

### Option 2 — **Co-link chronicle (and optionally inbox) to linked topics on write**

On event chronicle Save (and optionally when linking event↔topic), also put linked topic ids on `log.entityIds` (or mirror links).

| Pros | Cons |
|------|------|
| Existing topic loaders “just work” | Write-side coupling; harder to unlink cleanly |
| Topic chronicle shows the same rows | May duplicate rows across many topics if multi-linked |
| Matches correlation “capture once, link everywhere” | Need unlink / re-link migration rules |

**Code touchpoints:** `appendEventChronicleEntryAction`; maybe `setEntityLinkedIdsAction` backfill; careful with delete/unlink.

---

### Option 3 — **Promote Signals into topic Aliases (or shared vocabulary) on link**

When linking event→topic (or reverse), copy event `linkedTags` onto topic `linkedTags` (as Aliases).

| Pros | Cons |
|------|------|
| Cheap; chips appear on topic | **Aliases never feed Patterns** — does **not** fix pattern metrics |
| Reinforces shared vocabulary | Pollutes inbox-match synonyms with event markers |
| | Confuses the Alias vs Signal jobs |

**Not recommended** as the sole fix for “metrics don’t count.”

---

### Option 4 — **UX-only: clarify, don’t roll up**

Keep scopes strict. Teach that:

- Signals count only after chronicle Save (on the **event**).
- Topic metrics only count evidence **directly** linked to the topic.
- To affect a topic, tag evidence while the topic is linked on that evidence (or use Option 2 manually today).

| Pros | Cons |
|------|------|
| Honors tag-patterns vision (“scope = entity viewed”) | Fails the reported expectation after link |
| No aggregation surprises | Feels broken if linking is sold as correlation |

Use as interim copy if engineering is deferred — not as the end state if product wants link to mean shared binder.

---

### Option 5 — **Unified vocabulary + Option 1 or 2**

Rename both editors to one term (e.g. **Signals** or **Markers**), update `vocabulary-policy.md` / `ux-copy.ts`, **and** pick Option 1 or 2 for behavior.

Only do this if IA decides the dual label is harmful; behavior fix is still required.

---

## Decisions needed from IA / product

Please confirm:

### Decision 1 — Labels

- [ ] **D1-A** Keep **Aliases** (Topic) ≠ **Signals** (Event) — current policy  
- [ ] **D1-B** Unify both to **Signals**  
- [ ] **D1-C** Unify both to another term: _______________  
- [ ] **D1-D** Other: _______________

### Decision 2 — Metric / Pattern behavior after event↔topic link

- [ ] **D2-1a** Widen topic scope: include linked-event evidence for **Patterns + volume metrics** (Option 1a)  
- [ ] **D2-1b** Widen for **volume only**; Patterns stay topic-direct (Option 1b)  
- [ ] **D2-2** Co-link writes so event chronicle evidence also attaches to linked topics (Option 2)  
- [ ] **D2-1+2** Both widen reads and co-link writes  
- [ ] **D2-4** No rollup; clarify UX only (Option 4)  
- [ ] **D2-other** _______________

### Decision 3 — Link direction

- [ ] **D3-A** Treat event↔topic as **bidirectional** for discovery/metrics (recommended with 1 or 2)  
- [ ] **D3-B** Keep outbound-only; document that topic must own the link  

### Decision 4 — Topic metric pills

- [ ] **D4-A** Add an **Events** count pill when linked events exist  
- [ ] **D4-B** Leave pills as today (no Events dimension)

### Decision 5 — Aliases vs Patterns (confirm policy)

- [ ] **D5-A** Aliases **never** become Patterns (keep current)  
- [ ] **D5-B** Change policy so some topic `linkedTags` can contribute to Patterns (specify how)

---

## Suggested default package (if IA wants one recommendation)

| Decision | Default |
|----------|---------|
| D1 | **A** — keep Aliases ≠ Signals |
| D2 | **1a** — widen topic Patterns + volume to linked-event evidence |
| D3 | **A** — bidirectional link discovery |
| D4 | **A** — show Events count on topic |
| D5 | **A** — Aliases never Patterns |

Optional follow-up: Option 2 (co-link on chronicle Save) so Topic **Chronicle** lists the same rows users just wrote under the event — not only Patterns/counts.

---

## Code map (for implementers after confirmation)

| Area | Path |
|------|------|
| Vocabulary policy | `md/argus/vocabulary-policy.md` |
| Pattern rules | `md/argus/tag-patterns-vision.md`, `lib/argus/v2/tag-patterns.ts` |
| Topic metrics / Patterns | `lib/argus/v2/topic-loaders.ts`, `topic-browse-utils.ts` |
| Event Signals / Patterns | `lib/argus/v2/event-loaders.ts`, `event-chronicle.ts` |
| Chronicle Save | `app/argus/actions.ts` → `appendEventChronicleEntryAction` |
| Alias / Signal editors | `V2TopicAliasEditor`, `V2EventSignalEditor`, `V2VocabularyListEditor` |
| Copy | `lib/argus/ux-copy.ts` → `TOPIC_ALIASES`, `EVENT_SIGNALS` |
| Intelligence rollup (partial) | `lib/argus/v2/intelligence-viz.ts` → `getLinkedEventIdsForTopic`, `countEvidenceForTopicIncludingEvents` |
| Reverse link helper | `lib/argus/v2/scope-node-counts.ts` → `entitiesLinkingTo` |

---

## Out of scope for this handoff

- Changing Tag pattern thresholds (still ≥3 / 90d)
- Making Aliases feed Patterns without an explicit policy change (D5)
- Schema migration away from `linkedTags` dual-use (v01 target may separate later — `knowledge-model-v01.md`)
- Implementing any Option until Decisions 1–5 are checked

---

## Changelog

| Date | Change |
|------|--------|
| 2026-08-06 | Initial IA handoff from product report: signals/aliases on events don’t affect topic metrics after link; ontology + solution options |
