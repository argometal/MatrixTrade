/**
 * One-time JSON → Supabase Learning Outcome migration.
 *
 * Dry-run (default):
 *   npm run migrate:learning-outcomes-to-supabase
 *
 * Apply:
 *   npm run migrate:learning-outcomes-to-supabase -- --apply
 */
import {
  LEARNING_OUTCOME_KINDS,
  LEARNING_OUTCOME_LIFECYCLES,
  type LearningOutcome,
} from "../lib/learning-outcome-types";
import { readLearningOutcomesJsonFile } from "../lib/learning-outcomes-store/json";
import { createSupabaseLearningOutcomesStore } from "../lib/learning-outcomes-store/supabase";
import {
  learningOutcomeRowToRecord,
  learningOutcomeToRow,
} from "../lib/learning-outcomes-store/mapping";
import { createSupabaseAdmin } from "../lib/supabase/server";
import { sanitizeLearningSyncError } from "../lib/plan-outcome-learning-sync";

type Report = {
  total: number;
  valid: number;
  invalid: number;
  inserted: number;
  updated: number;
  skipped: number;
  conflicts: number;
  invalidRows: Array<{ id: string; reason: string }>;
  conflictRows: Array<{ id: string; reason: string }>;
  dryRun: boolean;
};

function validateRow(row: LearningOutcome): string | null {
  if (!row.id?.trim()) return "id required";
  if (!(LEARNING_OUTCOME_KINDS as readonly string[]).includes(row.kind)) {
    return `invalid kind ${row.kind}`;
  }
  if (!row.ticker?.trim()) return "ticker required";
  if (
    !(LEARNING_OUTCOME_LIFECYCLES as readonly string[]).includes(
      row.lifecycleStatus
    )
  ) {
    return `invalid lifecycleStatus ${row.lifecycleStatus}`;
  }
  if (!row.createdAt || !row.updatedAt) return "createdAt/updatedAt required";
  return null;
}

function parseUpdatedAt(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

async function loadRemoteById(id: string): Promise<LearningOutcome | undefined> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("learning_outcomes")
    .select("*")
    .eq("id", id.toUpperCase())
    .maybeSingle();
  if (error) {
    throw new Error(`Supabase read failed: ${error.message}`);
  }
  return data ? learningOutcomeRowToRecord(data as never) : undefined;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const report: Report = {
    total: 0,
    valid: 0,
    invalid: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    conflicts: 0,
    invalidRows: [],
    conflictRows: [],
    dryRun: !apply,
  };

  const rows = await readLearningOutcomesJsonFile();
  report.total = rows.length;

  const store = apply ? createSupabaseLearningOutcomesStore() : null;

  for (const row of rows) {
    const reason = validateRow(row);
    if (reason) {
      report.invalid += 1;
      report.invalidRows.push({ id: row.id || "(missing)", reason });
      continue;
    }
    report.valid += 1;

    let remote: LearningOutcome | undefined;
    try {
      remote = await loadRemoteById(row.id);
    } catch (err) {
      console.error(
        `Failed reading remote ${row.id}: ${sanitizeLearningSyncError(err)}`
      );
      process.exitCode = 1;
      return;
    }

    if (!remote) {
      if (apply && store) {
        await store.upsert(row);
      }
      report.inserted += 1;
      continue;
    }

    const localTs = parseUpdatedAt(row.updatedAt);
    const remoteTs = parseUpdatedAt(remote.updatedAt);
    if (localTs <= remoteTs) {
      report.skipped += 1;
      continue;
    }

    // JSON newer than Supabase — report conflict and update only with --apply.
    report.conflicts += 1;
    report.conflictRows.push({
      id: row.id,
      reason: `JSON updatedAt ${row.updatedAt} > remote ${remote.updatedAt}`,
    });
    if (apply && store) {
      await store.upsert(row);
      report.updated += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        ...report,
        note: apply
          ? "Applied upserts to Supabase. JSON file was not deleted."
          : "Dry-run only — pass --apply to persist.",
        // Prove mapping still includes zeros/false for sample shape
        sampleRowShape: learningOutcomeToRow({
          id: "LO-SAMPLE-001",
          kind: "unexecuted_plan_loss",
          ticker: "TEST",
          realizedR: 0,
          realizedPnL: 0,
          counterfactualR: -1,
          counterfactualDollarResult: null,
          excludedFromMetrics: false,
          lifecycleStatus: "concluded",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: "plan_outcome",
        }),
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(sanitizeLearningSyncError(err));
  process.exit(1);
});
