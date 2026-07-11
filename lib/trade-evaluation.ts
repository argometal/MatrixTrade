import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { getPlaybookById } from "./playbooks";
import type { Playbook } from "./playbook-types";
import type { Trade } from "./types";
import {
  DEFAULT_EXPECTED_HORIZON_DAYS,
  DEFAULT_MAXIMUM_OBSERVATION_DAYS,
  type ConcludeEvaluationInput,
  type ThesisOutcome,
  type TradeEvaluation,
  type TradeEvaluationStatus,
} from "./trade-evaluation-types";

const DATA_FILE = path.join(process.cwd(), "data", "trade-evaluations.json");

function newEvaluationId(): string {
  return `EVAL-${randomBytes(4).toString("hex").toUpperCase()}`;
}

async function readEvaluations(): Promise<TradeEvaluation[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as TradeEvaluation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw err;
  }
}

async function writeEvaluations(rows: TradeEvaluation[]): Promise<void> {
  await fs.writeFile(DATA_FILE, `${JSON.stringify(rows, null, 2)}\n`, "utf-8");
}

export function resolveHorizonDays(playbook?: Playbook | null): {
  expectedHorizonDays: number;
  maximumObservationDays: number;
} {
  return {
    expectedHorizonDays:
      playbook?.expectedHorizonDays && playbook.expectedHorizonDays > 0
        ? playbook.expectedHorizonDays
        : DEFAULT_EXPECTED_HORIZON_DAYS,
    maximumObservationDays:
      playbook?.maximumObservationDays && playbook.maximumObservationDays > 0
        ? playbook.maximumObservationDays
        : DEFAULT_MAXIMUM_OBSERVATION_DAYS,
  };
}

function addDays(iso: string, days: number): string {
  const base = Date.parse(iso);
  if (!Number.isFinite(base)) return new Date().toISOString();
  return new Date(base + days * 86_400_000).toISOString();
}

export function isEvaluationExpired(evaluation: TradeEvaluation, now = Date.now()): boolean {
  if (evaluation.status !== "observing") return false;
  const end = Date.parse(evaluation.observationEndsAt);
  return Number.isFinite(end) && now >= end;
}

export function maybeAutoConcludeEvaluation(
  evaluation: TradeEvaluation,
  now = Date.now()
): TradeEvaluation {
  if (!isEvaluationExpired(evaluation, now)) return evaluation;
  return {
    ...evaluation,
    status: "concluded",
    concludedAt: evaluation.observationEndsAt,
    thesisOutcome: evaluation.thesisOutcome ?? "inconclusive",
    timingOutcome: evaluation.timingOutcome ?? "inconclusive",
    executionOutcome: evaluation.executionOutcome ?? "inconclusive",
  };
}

async function upsertEvaluation(row: TradeEvaluation): Promise<TradeEvaluation> {
  const rows = await readEvaluations();
  const idx = rows.findIndex((r) => r.id === row.id);
  if (idx >= 0) rows[idx] = row;
  else rows.push(row);
  await writeEvaluations(rows);
  return row;
}

export async function getTradeEvaluations(): Promise<TradeEvaluation[]> {
  const rows = await readEvaluations();
  return rows.map((r) => maybeAutoConcludeEvaluation(r));
}

export async function getEvaluationByTradeId(
  tradeId: string
): Promise<TradeEvaluation | undefined> {
  const id = tradeId.toUpperCase();
  const rows = await getTradeEvaluations();
  const row = rows.find((r) => r.tradeId.toUpperCase() === id);
  if (!row) return undefined;
  const fresh = maybeAutoConcludeEvaluation(row);
  if (fresh.status !== row.status) {
    await upsertEvaluation(fresh);
  }
  return fresh;
}

export async function startObservationForTrade(
  trade: Trade
): Promise<{ evaluation?: TradeEvaluation; errors?: string[] }> {
  const tradeId = trade.id.toUpperCase();
  const existing = await getEvaluationByTradeId(tradeId);
  if (existing) return { evaluation: existing };

  if (trade.status !== "closed" || !trade.closedAt) {
    return { errors: ["Observation starts only after trade is closed."] };
  }

  const playbook = trade.playbookId
    ? await getPlaybookById(trade.playbookId)
    : undefined;
  const horizons = resolveHorizonDays(playbook);

  const evaluation: TradeEvaluation = {
    id: newEvaluationId(),
    tradeId,
    planId: trade.planId,
    expectedHorizonDays: horizons.expectedHorizonDays,
    observationEndsAt: addDays(trade.closedAt, horizons.maximumObservationDays),
    status: "observing",
    startedAt: trade.closedAt,
  };

  await upsertEvaluation(evaluation);
  return { evaluation };
}

export async function concludeTradeEvaluation(
  tradeId: string,
  input: ConcludeEvaluationInput
): Promise<{ evaluation?: TradeEvaluation; errors?: string[] }> {
  const id = tradeId.toUpperCase();
  const rows = await readEvaluations();
  const idx = rows.findIndex((r) => r.tradeId.toUpperCase() === id);
  if (idx < 0) {
    return { errors: ["No evaluation found for this trade. Close the trade first."] };
  }

  const current = maybeAutoConcludeEvaluation(rows[idx]);
  if (current.status === "concluded") {
    return { errors: ["Evaluation already concluded."] };
  }

  const thesisOutcome = input.thesisOutcome;
  const validThesis: ThesisOutcome[] = ["validated", "invalidated", "inconclusive"];
  if (!validThesis.includes(thesisOutcome)) {
    return { errors: ["thesisOutcome must be validated, invalidated, or inconclusive."] };
  }

  const updated: TradeEvaluation = {
    ...current,
    status: "concluded",
    concludedAt: new Date().toISOString(),
    thesisOutcome,
    timingOutcome: input.timingOutcome,
    executionOutcome: input.executionOutcome,
    finalLesson: input.finalLesson?.trim().slice(0, 500) || undefined,
  };

  rows[idx] = updated;
  await writeEvaluations(rows);
  return { evaluation: updated };
}

export async function persistAutoConcludedEvaluations(): Promise<number> {
  const rows = await readEvaluations();
  let changed = 0;
  const updated = rows.map((row) => {
    const next = maybeAutoConcludeEvaluation(row);
    if (next.status !== row.status) changed += 1;
    return next;
  });
  if (changed > 0) await writeEvaluations(updated);
  return changed;
}

export function evaluationStatusForTrade(
  evaluation?: TradeEvaluation | null
): TradeEvaluationStatus | null {
  if (!evaluation) return null;
  return maybeAutoConcludeEvaluation(evaluation).status;
}
