import { createSupabaseAdmin } from "../supabase/server";
import {
  learningOutcomeRowToRecord,
  learningOutcomeToRow,
} from "./mapping";
import type { LearningOutcomesStore } from "./types";
import type { LearningOutcome } from "../learning-outcome-types";

function isUniqueViolation(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("duplicate key") ||
    m.includes("unique constraint") ||
    m.includes("23505")
  );
}

async function loadCanonicalByIdentity(
  row: LearningOutcome
): Promise<LearningOutcome | undefined> {
  const supabase = createSupabaseAdmin();
  if (row.tradeId) {
    const { data, error } = await supabase
      .from("learning_outcomes")
      .select("*")
      .eq("trade_id", row.tradeId.toUpperCase())
      .maybeSingle();
    if (error) {
      throw new Error(`Supabase learning_outcomes read failed: ${error.message}`);
    }
    return data ? learningOutcomeRowToRecord(data as never) : undefined;
  }
  if (row.planId) {
    const { data, error } = await supabase
      .from("learning_outcomes")
      .select("*")
      .eq("plan_id", row.planId.toUpperCase())
      .is("trade_id", null)
      .maybeSingle();
    if (error) {
      throw new Error(`Supabase learning_outcomes read failed: ${error.message}`);
    }
    return data ? learningOutcomeRowToRecord(data as never) : undefined;
  }
  return undefined;
}

export function createSupabaseLearningOutcomesStore(): LearningOutcomesStore {
  return {
    async readAll() {
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase
        .from("learning_outcomes")
        .select("*")
        .order("id");
      if (error) {
        throw new Error(`Supabase learning_outcomes read failed: ${error.message}`);
      }
      return (data ?? []).map((row) =>
        learningOutcomeRowToRecord(row as never)
      );
    },
    async upsert(row) {
      const supabase = createSupabaseAdmin();
      const payload = learningOutcomeToRow(row);
      const { error } = await supabase
        .from("learning_outcomes")
        .upsert(payload, { onConflict: "id" });
      if (!error) return;

      if (isUniqueViolation(error.message)) {
        // Race on plan_id / trade_id uniqueness — reload canonical and merge upsert by that id.
        const existing = await loadCanonicalByIdentity(row);
        if (!existing) {
          throw new Error(
            `Supabase learning_outcomes upsert unique conflict and reload missed: ${error.message}`
          );
        }
        const merged: LearningOutcome = {
          ...row,
          id: existing.id,
          createdAt: existing.createdAt,
          mafExperimentId: row.mafExperimentId ?? existing.mafExperimentId,
        };
        const { error: retryError } = await supabase
          .from("learning_outcomes")
          .upsert(learningOutcomeToRow(merged), { onConflict: "id" });
        if (retryError) {
          throw new Error(
            `Supabase learning_outcomes upsert failed after conflict: ${retryError.message}`
          );
        }
        return;
      }

      throw new Error(`Supabase learning_outcomes upsert failed: ${error.message}`);
    },
    async upsertMany(rows) {
      for (const row of rows) {
        await this.upsert(row);
      }
    },
  };
}
