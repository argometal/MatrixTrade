import { stripComputedTradeFields } from "./mapping";
import type { Trade } from "../types";

/** Persisted trade fields only — matches data/trades.json on-disk shape. */
export function normalizeStoredTrade(trade: Trade): Record<string, unknown> {
  const stored = stripComputedTradeFields(trade);
  const out: Record<string, unknown> = {};

  const set = (key: string, value: unknown) => {
    if (value === undefined || value === null) return;
    if (typeof value === "string" && value.trim() === "") return;
    if (Array.isArray(value) && value.length === 0) return;
    out[key] = value;
  };

  set("id", stored.id.toUpperCase());
  set("ticker", stored.ticker.toUpperCase());
  set("entry", stored.entry);
  set("exit", stored.exit);
  set("stop", stored.stop);
  set("target", stored.target);
  set("shares", stored.shares);
  set("status", stored.status);
  set("createdAt", stored.createdAt);
  set("closedAt", stored.closedAt);
  set("setupId", stored.setupId);
  set("playbookId", stored.playbookId);
  set("setup", stored.setup);
  set("direction", stored.direction);
  set("plannedRisk", stored.plannedRisk);
  set("actualRisk", stored.actualRisk);
  set("riskRewardPlanned", stored.riskRewardPlanned);
  set("riskRewardActual", stored.riskRewardActual);
  set("mistakes", stored.mistakes);
  set("qualityEntry", stored.qualityEntry);
  set("qualityExit", stored.qualityExit);
  set("qualityMgmt", stored.qualityMgmt);
  set("reviewedAt", stored.reviewedAt);
  set("lesson", stored.lesson);
  set("actionItem", stored.actionItem);
  set("thesis", stored.thesis);
  set("psychology", stored.psychology);
  set("lessons", stored.lessons);
  set("notes", stored.notes);

  return out;
}

export interface TradeShapeDiff {
  id: string;
  field: string;
  json: unknown;
  supabase: unknown;
}

export function compareTradeShapes(jsonTrade: Trade, supabaseTrade: Trade): TradeShapeDiff[] {
  const left = normalizeStoredTrade(jsonTrade);
  const right = normalizeStoredTrade(supabaseTrade);
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  const diffs: TradeShapeDiff[] = [];

  for (const field of [...keys].sort()) {
    const a = left[field];
    const b = right[field];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      diffs.push({ id: jsonTrade.id.toUpperCase(), field, json: a ?? null, supabase: b ?? null });
    }
  }

  return diffs;
}

export function compareTradeLists(jsonTrades: Trade[], supabaseTrades: Trade[]): TradeShapeDiff[] {
  const jsonById = new Map(jsonTrades.map((t) => [t.id.toUpperCase(), t]));
  const supabaseById = new Map(supabaseTrades.map((t) => [t.id.toUpperCase(), t]));
  const diffs: TradeShapeDiff[] = [];

  for (const id of [...jsonById.keys()].sort()) {
    if (!supabaseById.has(id)) {
      diffs.push({ id, field: "(missing)", json: "present", supabase: null });
    }
  }

  for (const id of [...supabaseById.keys()].sort()) {
    if (!jsonById.has(id)) {
      diffs.push({ id, field: "(extra)", json: null, supabase: "present" });
    }
  }

  for (const id of [...jsonById.keys()].sort()) {
    const jsonTrade = jsonById.get(id);
    const supabaseTrade = supabaseById.get(id);
    if (jsonTrade && supabaseTrade) {
      diffs.push(...compareTradeShapes(jsonTrade, supabaseTrade));
    }
  }

  return diffs;
}
