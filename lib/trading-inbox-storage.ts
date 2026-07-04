import type { BridgeInboxItem } from "./bridge";
import { getLocalInboxItem } from "./trading-inbox-storage-local";
import { getSupabaseInboxItem } from "./trading-inbox-store/supabase";
import { listSupabasePendingInboxItems } from "./trading-inbox-submit";
import { listLocalInboxItems } from "./trading-inbox-storage-local";

export {
  createLocalInboxItem,
  getLocalInboxItem,
  listLocalInboxItems,
  setLocalInboxStatus,
} from "./trading-inbox-storage-local";

export async function listAllPendingInboxItems(
  workerItems: BridgeInboxItem[]
): Promise<BridgeInboxItem[]> {
  const [local, supabase] = await Promise.all([
    listLocalInboxItems(),
    listSupabasePendingInboxItems(),
  ]);
  return [...workerItems, ...supabase, ...local].sort((a, b) =>
    b.receivedAt.localeCompare(a.receivedAt)
  );
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
