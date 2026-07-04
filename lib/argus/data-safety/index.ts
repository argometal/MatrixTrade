import { isCloudInboxStore } from "../inbox-store/config";
import { isCloudJournalStore } from "../journal-store/config";
import { isDestructiveAllowed, isEphemeralJournalStorage, isJournalWriteBlocked, isVercelRuntime } from "./policy";
import { getArgusDataRoot, isExternalDataRoot } from "../storage/paths";
import type { StorageSafetyStatus } from "./policy";

export function getStorageSafetyStatus(): StorageSafetyStatus {
  return {
    journalStore: isCloudJournalStore() ? "supabase" : "filesystem",
    inboxStore: isCloudInboxStore() ? "supabase" : "filesystem",
    ephemeralJournal: isEphemeralJournalStorage(),
    writesBlocked: isJournalWriteBlocked(),
    externalDataRoot: isExternalDataRoot(),
    root: getArgusDataRoot(),
  };
}

export {
  isDestructiveAllowed,
  isEphemeralJournalStorage,
  isJournalWriteBlocked,
  isTestingUiEnabled,
  isVercelRuntime,
} from "./policy";

export { ArgusWriteBlockedError, ArgusDataSafetyError, writeArgusSafe } from "./write-gate";
export type { WriteIntent } from "./counts";
export type { StorageSafetyStatus } from "./policy";
export { countArgusData } from "./counts";
