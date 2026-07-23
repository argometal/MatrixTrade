/**
 * MTA Engine — RESERVED (Phase 1: do not implement behavior).
 *
 * Not a simple spaced-repetition motor.
 * Temporal behavior engine of knowledge:
 * answers “What happens to this over time?”
 *
 * Argus Engine must never implement these responsibilities.
 */

export const MTA_ENGINE_RESPONSIBILITIES = [
  "recurrence",
  "spaced_repetition",
  "pattern_detection",
  "usage_frequency",
  "attention",
  "priority",
  "temporal_signals",
  "scoring",
  "reminders",
  "statistical_learning",
  "temporal_evolution",
  "longitudinal_analysis",
] as const;

export type MtaEngineResponsibility = (typeof MTA_ENGINE_RESPONSIBILITIES)[number];

/** Placeholder signal shape — unused until MTA Engine is opened. */
export type AttentionSignal = {
  subjectId: string;
  score: number;
  reasons: string[];
  computedAt: string;
};

export type RecurrenceStats = {
  subjectId: string;
  count: number;
  window?: string;
};

/**
 * Reserved interface — methods must throw / remain unimplemented in Phase 1.
 * Opening MTA Engine requires an explicit later phase.
 */
export type MtaEngine = {
  measureUsage(subjectId: string): Promise<unknown>;
  measureRecurrence(subjectId: string): Promise<RecurrenceStats>;
  temporalPattern(subjectId: string): Promise<unknown>;
  attentionScore(subjectId: string): Promise<AttentionSignal>;
  /** May later feed Focus as calculated — never auto-write without policy. */
  suggestFocus(subjectId: string): Promise<boolean>;
};

export class MtaEngineNotImplementedError extends Error {
  constructor(method: string) {
    super(
      `MTA Engine is reserved in Phase 1 — "${method}" is not implemented. ` +
        `Responsibility: temporal behavior of knowledge (not Argus relations).`
    );
    this.name = "MtaEngineNotImplementedError";
  }
}

/** Stub — fails closed so nothing silently “implements” MTA in Argus. */
export const mtaEngineReserved: MtaEngine = {
  async measureUsage() {
    throw new MtaEngineNotImplementedError("measureUsage");
  },
  async measureRecurrence() {
    throw new MtaEngineNotImplementedError("measureRecurrence");
  },
  async temporalPattern() {
    throw new MtaEngineNotImplementedError("temporalPattern");
  },
  async attentionScore() {
    throw new MtaEngineNotImplementedError("attentionScore");
  },
  async suggestFocus() {
    throw new MtaEngineNotImplementedError("suggestFocus");
  },
};
