import assert from "node:assert/strict";
import { solidColorPng } from "../lib/argus/lab/mock-png";
import { fibDaysAtIndex, K_PARCOUR_FIB_DAYS, maxFibIndex } from "../lib/argus/lab/fib";
import {
  getPairState,
  loadDeckOverview,
  pickPairsForSession,
  recordMatchOutcome,
} from "../lib/argus/lab/match-logic";
import {
  computeScoreFromSlots,
  generateStimulusSequence,
  parseCardsInput,
  parseDigitsInput,
} from "../lib/argus/lab/sequence-logic";
import { isArgusSessionPath } from "../lib/auth/argus-session-path";
import type { TrainingLabPair } from "../lib/argus/lab/types";

assert.equal(isArgusSessionPath("/forge/lab"), true, "Training Lab uses Forge session (Argus auth)");
assert.equal(isArgusSessionPath("/forge/deck/abc"), true, "Chaos decks stay on Forge auth");
assert.notEqual("/forge/lab", "/forge/deck", "Training Lab route is not Chaos deck");

assert.deepEqual([...K_PARCOUR_FIB_DAYS], [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377]);
assert.equal(fibDaysAtIndex(0), 1);
assert.equal(fibDaysAtIndex(1), 2);
assert.equal(fibDaysAtIndex(maxFibIndex()), 377);

const cards = generateStimulusSequence({ modality: "cards", sequenceLength: 3, chunkSize: 2 });
assert.equal(cards.length, 3);
assert.match(cards[0].id, /^[A23456789TJQK][SHDC]-[A23456789TJQK][SHDC]$/);
assert.equal(new Set(cards.flatMap((c) => c.id.split("-"))).size, 6);

const digits = generateStimulusSequence({ modality: "digits", sequenceLength: 4, chunkSize: 2 });
assert.equal(digits.length, 4);
assert.match(digits[0].id, /^\d{2}$/);

const expected = [
  { id: "AS-2H", position: 0 },
  { id: "KD-9C", position: 1 },
];
const parsedOk = parseCardsInput("as-2h | kd-9c", expected);
assert.equal(parsedOk.every((s) => s.errorType == null), true);
const parsedMiss = parseCardsInput("AS-2H", expected);
assert.equal(parsedMiss[1].errorType, "missing");
const parsedDigits = parseDigitsInput("7 42", [
  { id: "07", position: 0 },
  { id: "42", position: 1 },
]);
assert.equal(parsedDigits.every((s) => s.errorType == null), true);

const perfect = computeScoreFromSlots(parsedOk, parsedOk, [800]);
assert.equal(perfect.accuracyImmediate, 1);
assert.equal(perfect.accuracyDelayed, 1);
assert.equal(perfect.retention, 1);
assert.ok(perfect.scoreNorm > 0);

const now = new Date("2026-09-18T12:00:00.000Z");
const prev = getPairState([], "pair-1");
const passed = recordMatchOutcome(prev, true, now);
assert.equal(passed.fibIndex, 1);
assert.equal(passed.passCount, 1);
assert.equal(passed.failCount, 0);
assert.ok(passed.dueAt);
const failed = recordMatchOutcome(passed, false, now);
assert.equal(failed.fibIndex, 0);
assert.equal(failed.failCount, 1);

const pairs: TrainingLabPair[] = [
  { id: "p1", deckId: "d1", captionText: "Palace", imageBasename: "a.png", createdAt: now.toISOString() },
  { id: "p2", deckId: "d1", captionText: "Door", imageBasename: "b.png", createdAt: now.toISOString() },
  { id: "p3", deckId: "d2", captionText: "Other", imageBasename: "c.png", createdAt: now.toISOString() },
];
const overview = loadDeckOverview(pairs, [], "d1", now);
assert.equal(overview.pairCount, 2);
assert.equal(overview.dueCount, 0);
assert.equal(overview.matchRatePercent, null);

const picked = pickPairsForSession(pairs, [], "d1", 8);
assert.equal(picked.length, 2);
assert.equal(pickPairsForSession(pairs, [], "d2", 8).length, 0, "need two pairs to play");

const png = solidColorPng(8, 8, 180, 60, 48);
assert.equal(png[0], 137);
assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
assert.ok(png.length > 40);

console.log("ok — training lab mock (sequence, Fib match, PNG seed, Chaos isolation)");
