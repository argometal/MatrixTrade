import { fibDaysAtIndex, K_PARCOUR_FIB_DAYS, maxFibIndex } from "./fib";
import type { TrainingLabPair, TrainingLabPairState } from "./types";

export type MatchDeckOverview = {
  pairCount: number;
  dueCount: number;
  sumPass: number;
  sumFail: number;
  countByFibIndex: number[];
  matchRatePercent: number | null;
};

export type PairWithState = TrainingLabPair & {
  state: TrainingLabPairState;
};

function defaultState(pairId: string): TrainingLabPairState {
  return {
    pairId,
    fibIndex: 0,
    dueAt: null,
    lastReviewAt: null,
    reps: 0,
    passCount: 0,
    failCount: 0,
  };
}

export function stateMap(states: TrainingLabPairState[]): Map<string, TrainingLabPairState> {
  return new Map(states.map((s) => [s.pairId, s]));
}

export function getPairState(
  states: TrainingLabPairState[],
  pairId: string,
): TrainingLabPairState {
  return states.find((s) => s.pairId === pairId) ?? defaultState(pairId);
}

export function loadDeckOverview(
  pairs: TrainingLabPair[],
  states: TrainingLabPairState[],
  deckId: string,
  now = new Date(),
): MatchDeckOverview {
  const deckPairs = pairs.filter((p) => p.deckId === deckId);
  const sm = stateMap(states);
  let sumPass = 0;
  let sumFail = 0;
  let dueCount = 0;
  const countByFibIndex = Array.from({ length: K_PARCOUR_FIB_DAYS.length }, () => 0);

  for (const p of deckPairs) {
    const s = sm.get(p.id) ?? defaultState(p.id);
    sumPass += s.passCount;
    sumFail += s.failCount;
    let fi = s.fibIndex;
    if (fi < 0) fi = 0;
    if (fi >= K_PARCOUR_FIB_DAYS.length) fi = K_PARCOUR_FIB_DAYS.length - 1;
    countByFibIndex[fi] += 1;
    if (s.dueAt) {
      const due = new Date(s.dueAt);
      if (!Number.isNaN(due.getTime()) && due.getTime() <= now.getTime()) {
        dueCount += 1;
      }
    }
  }

  const total = sumPass + sumFail;
  return {
    pairCount: deckPairs.length,
    dueCount,
    sumPass,
    sumFail,
    countByFibIndex,
    matchRatePercent: total > 0 ? Math.round((100 * sumPass) / total) : null,
  };
}

export function recordMatchOutcome(
  state: TrainingLabPairState,
  pass: boolean,
  now = new Date(),
): TrainingLabPairState {
  const t = now.toISOString();
  const current = state.fibIndex;
  const newIdx = pass
    ? Math.min(current + 1, maxFibIndex())
    : Math.max(current - 1, 0);
  const intervalDays = fibDaysAtIndex(newIdx);
  const nextDue = new Date(now.getTime() + intervalDays * 86400_000);
  return {
    pairId: state.pairId,
    fibIndex: newIdx,
    dueAt: nextDue.toISOString(),
    lastReviewAt: t,
    reps: state.reps + 1,
    passCount: state.passCount + (pass ? 1 : 0),
    failCount: state.failCount + (pass ? 0 : 1),
  };
}

export function pickPairsForSession(
  pairs: TrainingLabPair[],
  states: TrainingLabPairState[],
  deckId: string,
  maxPairs = 8,
): TrainingLabPair[] {
  const all = pairs.filter((p) => p.deckId === deckId);
  if (all.length < 2) return [];
  if (all.length <= maxPairs) {
    const shuffled = [...all];
    shuffleInPlace(shuffled);
    return shuffled;
  }

  const sm = stateMap(states);
  const sorted = [...all].sort((a, b) => {
    const sa = sm.get(a.id) ?? defaultState(a.id);
    const sb = sm.get(b.id) ?? defaultState(b.id);
    const c = sa.fibIndex - sb.fibIndex;
    if (c !== 0) return c;
    const f = sb.failCount - sa.failCount;
    if (f !== 0) return f;
    const da = sa.dueAt ? new Date(sa.dueAt).getTime() : 0;
    const db = sb.dueAt ? new Date(sb.dueAt).getTime() : 0;
    return da - db;
  });
  const picked = sorted.slice(0, maxPairs);
  shuffleInPlace(picked);
  return picked;
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
