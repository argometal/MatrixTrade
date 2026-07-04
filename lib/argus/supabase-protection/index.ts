export {
  isActiveRecord,
  countProtectedFromJournal,
  countRelationshipsInJournal,
  formatProtectedCounts,
  isProtectedCountDrop,
  softDeleteEntity,
  softDeleteLog,
  softDeleteInboxItem,
  type ProtectedCounts,
} from "./protected-counts";

export { exportArgusSupabaseTables, restoreArgusSupabaseFromExport, readJournalForCounts, type ArgusSupabaseExport } from "./export";

export {
  getProtectedCounts,
  runArgusSupabaseMigration,
  ArgusMigrationBlockedError,
} from "./migrate-gate";

export {
  isArgusSupabaseEnabled,
  isSupabaseDestructiveBlocked,
  supabaseDestructiveBlockedMessage,
} from "./policy";

export { isArgusSoftDeleteSchemaReady, resetArgusSoftDeleteSchemaCache } from "./schema-ready";
