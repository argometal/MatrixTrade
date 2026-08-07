# Evidence Engine — runtime mechanics

**Status:** Implemented (2026-08-06) — canonical runtime for Argus behavioral/retrieval surfaces  
**Principles:** [`../argus-review/12-evidence-engine-principles-solution.md`](../argus-review/12-evidence-engine-principles-solution.md)  
**Ship notes:** [`../argus-review/13-evidence-engine-implementation.md`](../argus-review/13-evidence-engine-implementation.md)  
**Identity:** Argus is an **Evidence Engine** (Git-like facts + derived views) — not a Behavior Engine / CRM scorecard.

---

## One-line thesis

Persist only what the user records. Derive retrieval answers on read. One user question → one computation and one vocabulary.

---

## Persisted (permanent)

| What | Where |
|------|--------|
| Evidence | `Log`, `InboxItem`, attachments |
| Tags on evidence | `Log.topics[]`, `InboxItem.topics[]` |
| Links | entity id lists on logs/inbox/entities |
| Dates / follow-ups | log dates, `followUpDate`, project start/end |
| Entities / Topics / Events | `Entity` (+ reference kind in notes) |
| Contact / my value marks | `Entity.contactValue[]`, `Entity.myValue[]` |
| Event Signals (binder marks) | Event `Entity.linkedTags[]` — binder only |
| Topic Aliases | Topic `Entity.linkedTags[]` |

**Not persisted as metrics:** Patterns, Network status, attention sort keys, health bands, strength%, outcomeScore.

**Deprecated field:** `Entity.strategicValue` — schema default on create; **not written** on entity update; read-fallback only when `contactValue` is empty (`contactValueWeight`).

---

## Derived (on read)

### 1) Who needs attention? — **one status vocabulary**

**User-facing:** `New` | `Active` | `Dormant` | `Lost` | `Archived`

| Surface | Function |
|---------|----------|
| Network browse | `deriveNetworkStatus` in `lib/argus/v2/network-browse-utils.ts` |
| Person contact | same status on Attention panel |
| Organization | `deriveOrgNetworkStatus` in `lib/argus/v2/loaders.ts` |

**Inputs:** last meaningful interaction, open follow-ups, contactValue weight (grace), evidence volume, lifecycle / Lost notes.

**Internal only (not a second product vocabulary):** `relationshipHealth` bands and `attentionScore` sort aid inside `buildEntityIntelligence`. Prefer browse status in UI.

**Explainability:** contact Attention may show a **reason** (`follow_up_pending`, `waiting_response`, …) — reason ≠ competing status enum.

### 2) What keeps recurring? — **Tag Patterns only**

`buildTagPatternsForScope` — Tags on evidence in scope, count ≥ 3, recent within 90d.

Event **Signals** stay on the event binder. They do **not** auto-copy onto every chronicle Note (that inflated Patterns). Add Tags on a Note when that entry should count toward Patterns.

Topic **Aliases** are vocabulary for match/suggest — never Patterns.

### 3) What needs triage? — **nav counts only**

`buildV2NavCounts`: inbox debt · network follow-ups due · needs classification.

These badges are **not** Event Signals and **not** Patterns.

### 4) Org relationship panel

Shows Network **status** + evidence facts (last interaction, open follow-ups, linked people, evidence count) + activity sparkline.

**Removed:** relationshipScore /5, Trust, Future Potential, Collaboration-from-outcomeScore.

---

## Explicitly retired

| Retired | Replacement |
|---------|-------------|
| Orphan metric UIs (`NetworkEntityCard`, `JournalHome` network home, `NetworkRelationshipMetricsDisplay`, …) | Deleted |
| Browse **strength%** / average strength | Status + evidence volume for smart views |
| `OUTCOME_SIGNALS` regex → `outcomeScore` | Neutralized (`outcomeScore` always 0) |
| Writing `strategicValue` on update | Omit from patch; contactValue / myValue remain |
| Parallel Healthy / Needs attention as primary Network label | Browse status vocabulary on contact |

---

## Code map (mechanics)

| Concern | Path |
|---------|------|
| Entity intelligence | `lib/argus/network-intelligence.ts` |
| Contact value marks + attention reason | `lib/argus/network-relationship-metrics.ts` |
| Browse status + cards | `lib/argus/v2/network-browse-utils.ts` |
| Contact page data | `lib/argus/v2/network-contact-loaders.ts` |
| Org page data | `lib/argus/v2/loaders.ts` → `loadOrganizationPageData` |
| Tag Patterns | `lib/argus/v2/tag-patterns.ts` |
| Nav triage counts | `buildV2NavCounts` in `lib/argus/v2/loaders.ts` |
| Event Signals copy | `EVENT_SIGNALS` in `lib/argus/ux-copy.ts` (binder UI; not stamped onto Notes) |
| Vocabulary policy | [`vocabulary-policy.md`](vocabulary-policy.md) |

---

## Do not build

- Behavior Engine / stored behavioral profiles  
- New score types (mistakeScore, successScore, …)  
- Flag as first-class entity  
- CRM KPI dashboards of stored relationship scores  
- AI-inferred persistent traits  

Recurring mistakes/successes = **Tags + Patterns + retrieval** when the user marks them.
