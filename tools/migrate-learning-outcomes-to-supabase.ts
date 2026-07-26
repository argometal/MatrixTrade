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
import {
  decideMigrationAction,
  matchRemoteCanonical,
  type MigrateAction,
  type MigrateMatchType,
  type RemoteCanonicalMatch,
} from "../lib/learning-outcomes-store/migrate-policy";
import { validateLearningOutcomeTimestamps } from "../lib/learning-outcomes-store/merge";
import { createSupabaseAdmin } from "../lib/supabase/server";
import { sanitizeLearningSyncError } from "../lib/plan-outcome-learning-sync";

type ConflictRow = {
  localId: string;
  remoteId?: string;
  matchType: MigrateMatchType;
  planId?: string | null;
  tradeId?: string | null;
  localUpdatedAt?: string;
  remoteUpdatedAt?: string;
  action: MigrateAction;
  detail?: string;
};

type Report = {
  total: number;
  valid: number;
  invalid: number;
  inserted: number;
  updated: number;
  skipped: number;
  conflicts: number;
  invalidRows: Array<{ id: string; reason: string }>;
  conflictRows: ConflictRow[];
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
  const ts = validateLearningOutcomeTimestamps(row);
  if (!ts.valid) return ts.errors.join("; ");
  return null;
}

/** Independent ID + business-identity loads; collision when they differ. */
async function loadRemoteCanonical(
  row: LearningOutcome
): Promise<RemoteCanonicalMatch> {
  const supabase = createSupabaseAdmin();
  const remoteRows: LearningOutcome[] = [];

  {
    const { data, error } = await supabase
      .from("learning_outcomes")
      .select("*")
      .eq("id", row.id.toUpperCase())
      .maybeSingle();
    if (error) throw new Error(`Supabase read failed: ${error.message}`);
    if (data) remoteRows.push(learningOutcomeRowToRecord(data as never));
  }

  if (row.tradeId) {
    const { data, error } = await supabase
      .from("learning_outcomes")
      .select("*")
      .eq("trade_id", row.tradeId.toUpperCase())
      .maybeSingle();
    if (error) throw new Error(`Supabase read failed: ${error.message}`);
    if (data) {
      const rec = learningOutcomeRowToRecord(data as never);
      if (!remoteRows.some((r) => r.id.toUpperCase() === rec.id.toUpperCase())) {
        remoteRows.push(rec);
      }
    }
  } else if (row.planId) {
    const { data, error } = await supabase
      .from("learning_outcomes")
      .select("*")
      .eq("plan_id", row.planId.toUpperCase())
      .is("trade_id", null)
      .maybeSingle();
    if (error) throw new Error(`Supabase read failed: ${error.message}`);
    if (data) {
      const rec = learningOutcomeRowToRecord(data as never);
      if (!remoteRows.some((r) => r.id.toUpperCase() === rec.id.toUpperCase())) {
        remoteRows.push(rec);
      }
    }
  }

  return matchRemoteCanonical(row, remoteRows);
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

    let remoteMatch: RemoteCanonicalMatch;
    try {
      remoteMatch = await loadRemoteCanonical(row);
    } catch (err) {
      console.error(
        `Failed reading remote ${row.id}: ${sanitizeLearningSyncError(err)}`
      );
      process.exitCode = 1;
      return;
    }

    const decision = decideMigrationAction({
      local: row,
      remote: remoteMatch.row,
      matchType: remoteMatch.matchType,
      existingById: remoteMatch.existingById,
      existingByIdentity: remoteMatch.existingByIdentity,
      detail: remoteMatch.detail,
    });

    if (decision.action === "invalid") {
      report.invalid += 1;
      report.invalidRows.push({
        id: row.id,
        reason: decision.detail ?? "invalid",
      });
      if (decision.conflicts) {
        report.conflicts += 1;
        report.conflictRows.push({
          localId: row.id,
          remoteId: remoteMatch.row?.id,
          matchType: remoteMatch.matchType,
          planId: row.planId ?? remoteMatch.row?.planId ?? null,
          tradeId: row.tradeId ?? remoteMatch.row?.tradeId ?? null,
          localUpdatedAt: row.updatedAt,
          remoteUpdatedAt: remoteMatch.row?.updatedAt,
          action: decision.action,
          detail: decision.detail,
        });
      }
      continue;
    }

    if (decision.conflicts) {
      report.conflicts += 1;
      report.conflictRows.push({
        localId: row.id,
        remoteId: remoteMatch.row?.id,
        matchType: remoteMatch.matchType,
        planId: row.planId ?? remoteMatch.row?.planId ?? null,
        tradeId: row.tradeId ?? remoteMatch.row?.tradeId ?? null,
        localUpdatedAt: row.updatedAt,
        remoteUpdatedAt: remoteMatch.row?.updatedAt,
        action: decision.action,
        detail: decision.detail,
      });
    }

    if (decision.action === "insert_new") {
      if (apply && store) await store.upsert(row);
      report.inserted += 1;
      continue;
    }

    if (decision.skipped) {
      report.skipped += 1;
      continue;
    }

    // Local newer / safe link fill → update canonical remote id (never insert).
    if (decision.action === "update_canonical_remote") {
      if (!decision.merged) {
        report.invalid += 1;
        report.invalidRows.push({
          id: row.id,
          reason: "missing merged canonical row",
        });
        continue;
      }
      if (apply && store) {
        await store.upsert(decision.merged);
        report.updated += 1;
      } else {
        // Dry-run: report intended update without writing.
        report.updated += 1;
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        ...report,
        note: apply
          ? "Applied upserts to Supabase. JSON file was not deleted."
          : "Dry-run only — pass --apply to persist.",
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
