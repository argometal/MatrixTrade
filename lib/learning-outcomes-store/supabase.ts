import { createSupabaseAdmin } from "../supabase/server";
import {
  learningOutcomeRowToRecord,
  learningOutcomeToRow,
} from "./mapping";
import {
  resolveExistingLearningOutcome,
  resolveLearningOutcomeUpsert,
} from "./merge";
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

async function loadById(id: string): Promise<LearningOutcome | undefined> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("learning_outcomes")
    .select("*")
    .eq("id", id.toUpperCase())
    .maybeSingle();
  if (error) {
    throw new Error(`Supabase learning_outcomes read failed: ${error.message}`);
  }
  return data ? learningOutcomeRowToRecord(data as never) : undefined;
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
  if (row.planId && !row.tradeId) {
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

async function writeById(row: LearningOutcome): Promise<LearningOutcome> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("learning_outcomes")
    .upsert(learningOutcomeToRow(row), { onConflict: "id" });
  if (error) {
    throw new Error(`Supabase learning_outcomes upsert failed: ${error.message}`);
  }
  const reloaded = await loadById(row.id);
  return reloaded ?? row;
}

function resolveAgainstLoaded(
  incoming: LearningOutcome,
  existingById: LearningOutcome | undefined,
  existingByIdentity: LearningOutcome | undefined
): { action: "insert" | "skip" | "write"; row: LearningOutcome } {
  const target = resolveExistingLearningOutcome({
    incoming,
    existingById,
    existingByIdentity,
  });
  return resolveLearningOutcomeUpsert(target.existing, incoming);
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
      // Independent loads — never skip the ID read via null-coalescing.
      const existingById = await loadById(row.id);
      const existingByIdentity = await loadCanonicalByIdentity(row);
      const resolved = resolveAgainstLoaded(
        row,
        existingById,
        existingByIdentity
      );

      if (resolved.action === "skip") return resolved.row;
      if (resolved.action === "write") return writeById(resolved.row);

      const supabase = createSupabaseAdmin();
      const { error } = await supabase
        .from("learning_outcomes")
        .upsert(learningOutcomeToRow(resolved.row), { onConflict: "id" });
      if (!error) {
        return (await loadById(row.id)) ?? resolved.row;
      }

      if (isUniqueViolation(error.message)) {
        // Race retry: reload BOTH id and business identity, then re-resolve.
        const retryById = await loadById(row.id);
        const retryByIdentity = await loadCanonicalByIdentity(row);
        const retry = resolveAgainstLoaded(row, retryById, retryByIdentity);
        if (retry.action === "skip") return retry.row;
        if (retry.action === "write") return writeById(retry.row);
        throw new Error(
          `Supabase learning_outcomes upsert unique conflict and reload missed: ${error.message}`
        );
      }

      throw new Error(`Supabase learning_outcomes upsert failed: ${error.message}`);
    },
    async upsertMany(rows) {
      const out: LearningOutcome[] = [];
      for (const row of rows) out.push(await this.upsert(row));
      return out;
    },
  };
}
