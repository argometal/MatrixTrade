import type { BridgeInboxItem } from "./bridge";
import { getLocalInboxItem } from "./trading-inbox-storage-local";
import { getSupabaseInboxItem } from "./trading-inbox-store/supabase";
import { listPendingInboxForRuntime } from "./trading-inbox-submit";

export {
  createLocalInboxItem,
  getLocalInboxItem,
  listLocalInboxItems,
  setLocalInboxStatus,
} from "./trading-inbox-storage-local";

export async function listAllPendingInboxItems(
  workerItems: BridgeInboxItem[]
): Promise<BridgeInboxItem[]> {
  return listPendingInboxForRuntime(workerItems);
}

export async function getInboxItemById(
  id: string,
  workerItems: BridgeInboxItem[],
  originHint?: string
): Promise<BridgeInboxItem | undefined> {
  if (originHint === "local") return getLocalInboxItem(id);
  if (originHint === "supabase") {
    try {
      return await getSupabaseInboxItem(id);
    } catch {
      return undefined;
    }
  }

  const fromWorker = workerItems.find((item) => item.id === id);
  if (fromWorker) return fromWorker;

  try {
    const fromSupabase = await getSupabaseInboxItem(id);
    if (fromSupabase) return fromSupabase;
  } catch {
    // table may not exist yet
  }

  return getLocalInboxItem(id);
}
