/**
 * ArgusForge — hub contracts + thin registry index (Phase 1).
 * Not a product app. Not Alexandria. Not MTA Engine behavior.
 */

export * from "./contracts";
export {
  FORGE_DATA_DIR,
  FORGE_REGISTRY_FILE,
  FORGE_STORE_VERSION,
  emptyForgeRegistryStore,
  type ForgeRegistryStore,
} from "./store/types";
export {
  addAiProposal,
  addRelation,
  captureChaos,
  listByOperationalState,
  readForgeRegistry,
  setAiProposalStatus,
  setEntryPlacement,
  writeForgeRegistry,
} from "./store/json-registry";
