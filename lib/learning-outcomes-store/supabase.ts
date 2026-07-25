import { createSupabaseAdmin } from "../supabase/server";
import {
  learningOutcomeRowToRecord,
  learningOutcomeToRow,
} from "./mapping";
import {
  compareLearningOutcomeFreshness,
  mergeCanonicalLearningOutcome,
  mergeEqualTimestampLinks,
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

function resolveAgainstExisting(
  existing: LearningOutcome,
  incoming: LearningOutcome
): { action: "skip" | "write"; row: LearningOutcome } {
  const freshness = compareLearningOutcomeFreshness(existing, incoming);
  if (freshness === "existing_newer") {
    return { action: "skip", row: existing };
  }
  if (freshness === "equal") {
    const merged = mergeEqualTimestampLinks(existing, incoming);
    const changed =
      merged.observationId !== existing.observationId ||
      merged.mafExperimentId !== existing.mafExperimentId ||
      merged.stockThesisId !== existing.stockThesisId ||
      merged.playbookId !== existing.playbookId;
    return { action: changed ? "write" : "skip", row: merged };
  }
  return {
    action: "write",
    row: mergeCanonicalLearningOutcome(existing, incoming),
  };
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
      // Prefer identity canonical when it already exists under another id.
      const byIdentity = await loadCanonicalByIdentity(row);
      if (byIdentity && byIdentity.id.toUpperCase() !== row.id.toUpperCase()) {
        const resolved = resolveAgainstExisting(byIdentity, row);
        if (resolved.action === "skip") return resolved.row;
        return writeById(resolved.row);
      }

      const byId = byIdentity ?? (await loadById(row.id));
      if (byId) {
        const resolved = resolveAgainstExisting(byId, row);
        if (resolved.action === "skip") return resolved.row;
        return writeById(resolved.row);
      }

      const supabase = createSupabaseAdmin();
      const { error } = await supabase
        .from("learning_outcomes")
        .upsert(learningOutcomeToRow(row), { onConflict: "id" });
      if (!error) {
        return (await loadById(row.id)) ?? row;
      }

      if (isUniqueViolation(error.message)) {
        const existing = await loadCanonicalByIdentity(row);
        if (!existing) {
          throw new Error(
            `Supabase learning_outcomes upsert unique conflict and reload missed: ${error.message}`
          );
        }
        const resolved = resolveAgainstExisting(existing, row);
        if (resolved.action === "skip") return resolved.row;
        return writeById(resolved.row);
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
