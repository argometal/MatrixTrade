import { createSupabaseAdmin } from "../supabase/server";
import {
  learningOutcomeRowToRecord,
  learningOutcomeToRow,
} from "./mapping";
import { resolveLearningOutcomeUpsert } from "./merge";
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
      const byIdentity = await loadCanonicalByIdentity(row);
      const byId =
        byIdentity && byIdentity.id.toUpperCase() === row.id.toUpperCase()
          ? byIdentity
          : byIdentity ?? (await loadById(row.id));
      // Prefer identity canonical when different id shares plan/trade.
      const existing =
        byIdentity && byIdentity.id.toUpperCase() !== row.id.toUpperCase()
          ? byIdentity
          : byId;

      if (existing) {
        const resolved = resolveLearningOutcomeUpsert(existing, row);
        if (resolved.action === "skip") return resolved.row;
        if (resolved.action === "write") return writeById(resolved.row);
      }

      const resolved = resolveLearningOutcomeUpsert(undefined, row);
      const supabase = createSupabaseAdmin();
      const { error } = await supabase
        .from("learning_outcomes")
        .upsert(learningOutcomeToRow(resolved.row), { onConflict: "id" });
      if (!error) {
        return (await loadById(row.id)) ?? resolved.row;
      }

      if (isUniqueViolation(error.message)) {
        const existingAfter = await loadCanonicalByIdentity(row);
        if (!existingAfter) {
          throw new Error(
            `Supabase learning_outcomes upsert unique conflict and reload missed: ${error.message}`
          );
        }
        const retry = resolveLearningOutcomeUpsert(existingAfter, row);
        if (retry.action === "skip") return retry.row;
        return writeById(retry.row);
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
