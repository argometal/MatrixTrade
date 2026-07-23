/**
 * Forge local index shape — identity registry + chaos staging metadata.
 * NOT a product database. NOT Alexandria. Product bytes stay in product stores.
 */

import type { AiProposal } from "../contracts/ai-proposals";
import type { ArgusRelation } from "../contracts/argus-engine";
import type { ChaosUnit } from "../contracts/chaos";
import type { MemoryEntry } from "../contracts/memory-registry";

export const FORGE_STORE_VERSION = 1 as const;

export type ForgeRegistryStore = {
  version: typeof FORGE_STORE_VERSION;
  updatedAt: string;
  entries: MemoryEntry[];
  chaos: ChaosUnit[];
  relations: ArgusRelation[];
  aiProposals: AiProposal[];
};

export function emptyForgeRegistryStore(nowIso: string): ForgeRegistryStore {
  return {
    version: FORGE_STORE_VERSION,
    updatedAt: nowIso,
    entries: [],
    chaos: [],
    relations: [],
    aiProposals: [],
  };
}

/** Default on-disk path (gitignored). */
export const FORGE_DATA_DIR = "data/forge";
export const FORGE_REGISTRY_FILE = "data/forge/registry.json";
