/**
 * Event Tag ↔ Note Tag helpers.
 * Canonical implementation lives in `tag-pipeline.ts` (one system for every binder).
 */
export {
  evidenceTagKeysForEvent,
  mergeBinderTagLists,
  placeholderBodyForEventTags,
  tagsMissingFromEventEvidence,
} from "./tag-pipeline";
