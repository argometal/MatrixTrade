/**
 * Tag display and pattern thresholds.
 *
 * Industry-aligned defaults (not arbitrary):
 * - Picker suggestions: 10 — Material Design / Algolia facet default for autocomplete
 * - Tag cloud: 20 — common folksonomy & Elasticsearch aggregation display cap
 * - Pattern floor: 3 — rule-of-three minimum before a recurrence counts as signal
 * - Pattern freshness: 90 days — matches portfolio recency window in intelligence-viz
 * - Scope badges: 3 visible + overflow — standard dashboard alert-chip limit
 */
export const TAG_PICKER_SUGGESTION_LIMIT = 10;
export const TAG_CLOUD_DISPLAY_LIMIT = 20;
export const TAG_PATTERN_MIN_COUNT = 3;
export const TAG_PATTERN_FRESHNESS_DAYS = 90;
export const TAG_PATTERN_BADGE_LIMIT = 3;
