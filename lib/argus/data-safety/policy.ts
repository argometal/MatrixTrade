import { isCloudJournalStore } from "../journal-store/config";
import { isExternalDataRoot } from "../storage/paths";

/** Vercel serverless filesystem is ephemeral between deploys. */
export function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL);
}

/** Journal on local/repo disk — lost on Vercel redeploy unless external ARGUS_DATA_DIR on persistent host. */
export function isEphemeralJournalStorage(): boolean {
  if (isCloudJournalStore()) return false;
  if (isVercelRuntime()) return true;
  return !isExternalDataRoot();
}

/** Block journal writes that would not survive deploy. */
export function isJournalWriteBlocked(): boolean {
  if (isCloudJournalStore()) return false;
  if (isVercelRuntime()) return true;
  return false;
}

export function isDestructiveAllowed(): boolean {
  if (process.env.ARGUS_ALLOW_DESTRUCTIVE === "1") return true;
  if (isVercelRuntime()) return false;
  if (process.env.NODE_ENV === "production") return false;
  return process.env.ARGUS_TESTING_UI === "1";
}

export function isTestingUiEnabled(): boolean {
  return process.env.ARGUS_TESTING_UI === "1" || (!isVercelRuntime() && process.env.NODE_ENV !== "production");
}

export interface StorageSafetyStatus {
  journalStore: "supabase" | "filesystem";
  inboxStore: "supabase" | "filesystem";
  ephemeralJournal: boolean;
  writesBlocked: boolean;
  externalDataRoot: boolean;
  root: string;
}
