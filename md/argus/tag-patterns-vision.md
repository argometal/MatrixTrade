# ARGUS — Tag patterns & display limits

**Status:** Canonical (2026-07-10)  
**Related:** [`evidence-organization-vision.md`](evidence-organization-vision.md) · [`knowledge-model-v01.md`](knowledge-model-v01.md) · [`intelligence-viz-plan.md`](intelligence-viz-plan.md) · [`observation-engine-vision.md`](observation-engine-vision.md)

---

## Principle

ARGUS gathers evidence from stronger applications, groups it by **topics** and **entities**, and delivers packages. It does not dig, infer gaps, or assign meaning the user did not mark.

**Red patterns** come only from **tags on evidence**, repeated within a scope. Topics and entities are never flagged as a whole — one bad item must not disguise the rest of a binder.

---

## Tags vs topics

| | **Topic** | **Tag** |
|---|-----------|---------|
| Role | Permanent grouping lens | Lightweight mark on evidence |
| Question | “What is this about?” | “How do I process / classify this?” |
| Flag? | **Never** | Yes — when recurrence threshold met |

User defines what `#gap`, `#quality`, `#failure`, or any custom tag means. Argus only counts repetition and surfaces drill-down.

---

## Display limits (industry-aligned)

| Constant | Value | Rationale |
|----------|-------|-----------|
| Picker suggestions | **10** | Autocomplete / faceted-search default (Material, Algolia) |
| Tag cloud | **20** | Scannable folksonomy cap (Elasticsearch top terms) |
| Pattern minimum | **3** | Rule of three — singletons are noise |
| Pattern freshness | **90 days** | Matches portfolio recency window |
| Scope badges | **3** + overflow | Dashboard alert-chip convention |

Unused tags fall off suggestions naturally. Users can always create a new tag; it appears in pickers only after frequency earns a slot.

---

## Pattern rules (v1)

1. Tag is applied on **evidence only** — register entry (`log.topics[]`) or inbox row (`inbox.topics[]`).
2. Pattern = same tag appears on **≥ 3** evidence items **in the open scope** (org, project, topic, event).
3. At least **one** tagged item must be within the last **90 days** — older-only patterns do not alert.
4. Singletons and pairs: stored, included in Deliver filters, **no** pulse or red overlay.
5. Scope is the entity being viewed — not global unless on Home tag cloud.

---

## Surfaces

| Surface | Behavior |
|---------|----------|
| Entity header | Small pattern badges `#tag (N)` — max 3 visible, then `+N` |
| Evidence / inbox | Filter by tag (existing `?tag=` on inbox) |
| Treemap | Amber stroke when scope has ≥1 active pattern |
| Deliver | Export all evidence matching tag in scope |

**Not in v1:** Argus-defined gap/quality/error heuristics, topic-level red paint, AI classification.

---

## Code

- Limits: `lib/argus/tag-limits.ts`
- Pattern builder: `lib/argus/v2/tag-patterns.ts`
- UI: `app/argus/v2/components/V2TagPatternBadges.tsx`

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-10 | Locked user-defined tag patterns; industry display limits; replaced auto flag draft in intelligence-viz-plan |
