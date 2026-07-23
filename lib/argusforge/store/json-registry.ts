/**
 * Thin JSON persistence for Memory Registry index + Chaos staging metadata.
 * Phase 1 infrastructure — no UI, no product migration, no Alexandria.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import type { ChaosPart, ChaosUnit } from "../contracts/chaos";
import { createEmptyChaosUnit } from "../contracts/chaos";
import { createChaosMemoryEntry } from "../contracts/memory-registry";
import type { MemoryEntry } from "../contracts/memory-registry";
import type { OperationalPlacement } from "../contracts/organization";
import type { ArgusRelation } from "../contracts/argus-engine";
import type { AiProposal } from "../contracts/ai-proposals";
import {
  emptyForgeRegistryStore,
  FORGE_REGISTRY_FILE,
  type ForgeRegistryStore,
} from "./types";

function rootPath(file = FORGE_REGISTRY_FILE): string {
  return join(process.cwd(), file);
}

export function readForgeRegistry(file = FORGE_REGISTRY_FILE): ForgeRegistryStore {
  const path = rootPath(file);
  if (!existsSync(path)) {
    return emptyForgeRegistryStore(new Date().toISOString());
  }
  const raw = JSON.parse(readFileSync(path, "utf8")) as ForgeRegistryStore;
  if (raw.version !== 1) {
    throw new Error(`Unsupported forge registry version: ${String((raw as { version?: unknown }).version)}`);
  }
  return raw;
}

export function writeForgeRegistry(store: ForgeRegistryStore, file = FORGE_REGISTRY_FILE): void {
  const path = rootPath(file);
  mkdirSync(dirname(path), { recursive: true });
  const next: ForgeRegistryStore = {
    ...store,
    updatedAt: new Date().toISOString(),
  };
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  renameSync(tmp, path);
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Capture: create Chaos unit + Memory Entry (Active by default). */
export function captureChaos(input: {
  title?: string;
  parts?: ChaosPart[];
  source?: ChaosUnit["source"];
  context?: string;
  metadata?: ChaosUnit["metadata"];
}): { chaos: ChaosUnit; entry: MemoryEntry; store: ForgeRegistryStore } {
  const now = new Date().toISOString();
  const chaosId = newId("chaos");
  const entryId = newId("mem");
  const chaos: ChaosUnit = {
    ...createEmptyChaosUnit(chaosId, now),
    title: input.title,
    parts: input.parts ?? [],
    source: input.source,
    metadata: input.metadata,
  };
  const entry = createChaosMemoryEntry({
    id: entryId,
    chaosId,
    nowIso: now,
    context: input.context,
  });
  const store = readForgeRegistry();
  store.chaos.push(chaos);
  store.entries.push(entry);
  writeForgeRegistry(store);
  return { chaos, entry, store: readForgeRegistry() };
}

export function setEntryPlacement(entryId: string, placement: OperationalPlacement): MemoryEntry {
  const store = readForgeRegistry();
  const entry = store.entries.find((e) => e.id === entryId);
  if (!entry) throw new Error(`Memory entry not found: ${entryId}`);
  entry.placement = placement;
  entry.updatedAt = new Date().toISOString();
  writeForgeRegistry(store);
  return entry;
}

/** Relations stay pending until accepted — folders never involved. */
export function addRelation(relation: Omit<ArgusRelation, "id" | "createdAt"> & { id?: string }): ArgusRelation {
  const store = readForgeRegistry();
  const full: ArgusRelation = {
    ...relation,
    id: relation.id ?? newId("rel"),
    createdAt: new Date().toISOString(),
  };
  store.relations.push(full);
  writeForgeRegistry(store);
  return full;
}

export function addAiProposal(proposal: Omit<AiProposal, "id" | "createdAt" | "status"> & { id?: string }): AiProposal {
  const store = readForgeRegistry();
  const full: AiProposal = {
    ...proposal,
    id: proposal.id ?? newId("aip"),
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  store.aiProposals.push(full);
  writeForgeRegistry(store);
  return full;
}

export function setAiProposalStatus(id: string, status: AiProposal["status"]): AiProposal {
  const store = readForgeRegistry();
  const proposal = store.aiProposals.find((p) => p.id === id);
  if (!proposal) throw new Error(`AI proposal not found: ${id}`);
  proposal.status = status;
  writeForgeRegistry(store);
  return proposal;
}

export function listByOperationalState(state: OperationalPlacement["state"]): MemoryEntry[] {
  return readForgeRegistry().entries.filter((e) => e.placement.state === state);
}
