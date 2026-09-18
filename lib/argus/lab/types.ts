/** Argus Forge Training Lab — experimental; separate from Chaos decks and Argus journal. */

export const TRAINING_LAB_SCHEMA_VERSION = 1;

export type TrainingLabDeck = {
  id: string;
  name: string;
  createdAt: string;
};

export type TrainingLabPair = {
  id: string;
  deckId: string;
  captionText: string;
  transliteration?: string;
  gloss?: string;
  /** Basename under `files/training-lab/` */
  imageBasename: string;
  createdAt: string;
};

export type TrainingLabPairState = {
  pairId: string;
  fibIndex: number;
  dueAt: string | null;
  lastReviewAt: string | null;
  reps: number;
  passCount: number;
  failCount: number;
};

export type TrainingLabSequenceMetric = {
  id: string;
  dateUtc: string;
  sessionId: string;
  modality: "cards" | "digits";
  scoreNorm: number;
  accImmediate: number;
  accDelayed: number;
  retention: number;
  sequenceLength: number;
};

export type TrainingLabData = {
  version: typeof TRAINING_LAB_SCHEMA_VERSION;
  decks: TrainingLabDeck[];
  pairs: TrainingLabPair[];
  pairStates: TrainingLabPairState[];
  sequenceMetrics: TrainingLabSequenceMetric[];
};
