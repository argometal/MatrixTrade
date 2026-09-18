const RANKS = "A23456789TJQK";
const SUITS = "SHDC";

export type SequenceStimulus = { id: string; position: number };

export type SequenceConfig = {
  modality: "cards" | "digits";
  sequenceLength: number;
  chunkSize: 2;
};

function cardCode(rankIndex: number, suitIndex: number): string {
  return `${RANKS[rankIndex]}${SUITS[suitIndex]}`;
}

export function generateStimulusSequence(config: SequenceConfig): SequenceStimulus[] {
  const { sequenceLength, chunkSize, modality } = config;
  if (chunkSize !== 2 && modality === "cards") {
    throw new Error("Cards v1 requires chunkSize 2");
  }
  if (modality === "cards") return genCards(sequenceLength, chunkSize);
  return genDigits(sequenceLength);
}

function genCards(sequenceLength: number, chunkSize: number): SequenceStimulus[] {
  const need = sequenceLength * chunkSize;
  if (need > 52) throw new Error("Max 26 card pairs in one sequence");
  const pool: string[] = [];
  for (let r = 0; r < RANKS.length; r++) {
    for (let s = 0; s < SUITS.length; s++) {
      pool.push(cardCode(r, s));
    }
  }
  shuffle(pool);
  const out: SequenceStimulus[] = [];
  for (let i = 0; i < sequenceLength; i++) {
    const a = pool.pop()!;
    const b = pool.pop()!;
    out.push({ id: `${a}-${b}`, position: i });
  }
  return out;
}

function genDigits(sequenceLength: number): SequenceStimulus[] {
  if (sequenceLength > 100) throw new Error("Max 100 digits 00–99");
  const all = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, "0"));
  shuffle(all);
  return all.slice(0, sequenceLength).map((id, position) => ({ id, position }));
}

function shuffle(arr: string[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export type ParsedSlot = {
  position: number;
  expected: string;
  user: string | null;
  errorType: string | null;
};

function normCardToken(t: string): string {
  return t.toUpperCase().replace(/\s/g, "");
}

function normDigitToken(t: string): string {
  const s = t.trim();
  if (!s) return "";
  const n = Number.parseInt(s, 10);
  if (Number.isNaN(n) || n < 0 || n > 99) return s;
  return n.toString().padStart(2, "0");
}

function splitCardsInput(input: string): string[] {
  return input
    .split("|")
    .map((e) => e.trim())
    .filter(Boolean);
}

function splitDigitsInput(input: string): string[] {
  return input
    .split(/\s+/)
    .map((e) => e.trim())
    .filter(Boolean);
}

export function parseCardsInput(input: string, expected: SequenceStimulus[]): ParsedSlot[] {
  const toks = splitCardsInput(input).map(normCardToken);
  return alignTokens(toks, expected, false);
}

export function parseDigitsInput(input: string, expected: SequenceStimulus[]): ParsedSlot[] {
  const toks = splitDigitsInput(input).map(normDigitToken);
  return alignTokens(toks, expected, true);
}

function alignTokens(
  toks: string[],
  expected: SequenceStimulus[],
  isDigits: boolean,
): ParsedSlot[] {
  const normExpected = (e: string) => (isDigits ? normDigitToken(e) : normCardToken(e));
  const out: ParsedSlot[] = [];
  for (let i = 0; i < expected.length; i++) {
    const exp = normExpected(expected[i].id);
    if (i >= toks.length) {
      out.push({ position: i, expected: exp, user: null, errorType: "missing" });
      continue;
    }
    const user = toks[i];
    const ok = user === exp;
    out.push({
      position: i,
      expected: exp,
      user,
      errorType: ok ? null : "mismatch",
    });
  }
  return out;
}

export type ScoreMetrics = {
  accuracyImmediate: number;
  avgLatencyMs: number;
  scoreNorm: number;
  accuracyDelayed: number;
  retention: number;
};

export function computeScoreFromSlots(
  immediate: ParsedSlot[],
  delayed: ParsedSlot[],
  latenciesMs: number[],
): ScoreMetrics {
  if (immediate.length === 0) {
    return {
      accuracyImmediate: 0,
      avgLatencyMs: 0,
      scoreNorm: 0,
      accuracyDelayed: 0,
      retention: 0,
    };
  }
  const correctI = immediate.filter((s) => s.errorType == null).length;
  const accI = correctI / immediate.length;
  let sumL = latenciesMs.reduce((a, b) => a + b, 0);
  let avgL = immediate.length ? sumL / immediate.length : 0;
  if (avgL < 1) avgL = 1;
  const raw = accI * (1000 / avgL);
  const sn = raw > 1 ? 1 : raw;

  if (delayed.length === 0) {
    return {
      accuracyImmediate: accI,
      avgLatencyMs: avgL,
      scoreNorm: sn,
      accuracyDelayed: 0,
      retention: 0,
    };
  }
  const correctD = delayed.filter((s) => s.errorType == null).length;
  const accD = correctD / delayed.length;
  const ret = accI <= 0 ? 0 : accD / accI;
  return {
    accuracyImmediate: accI,
    avgLatencyMs: avgL,
    scoreNorm: sn,
    accuracyDelayed: accD,
    retention: ret,
  };
}

/** Display hint for encode phase */
export function formatStimulusForDisplay(stimulus: SequenceStimulus, modality: "cards" | "digits"): string {
  if (modality === "digits") return stimulus.id;
  return stimulus.id;
}

export function expectedRecallHint(modality: "cards" | "digits"): string {
  if (modality === "cards") {
    return "Enter pairs separated by | (e.g. AS-2H|KD-9C). Two cards per chunk, same order as shown.";
  }
  return "Enter numbers separated by spaces (e.g. 07 42 19), same order as shown.";
}
