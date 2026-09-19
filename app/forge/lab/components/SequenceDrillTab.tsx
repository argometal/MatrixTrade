"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveSequenceMetricAction } from "@/app/forge/lab/actions";
import {
  computeScoreFromSlots,
  expectedRecallHint,
  generateStimulusSequence,
  parseCardsInput,
  parseDigitsInput,
  type ParsedSlot,
  type SequenceStimulus,
} from "@/lib/argusforge/training-lab/sequence-logic";
import type { TrainingLabData } from "@/lib/argusforge/training-lab/types";

type Phase =
  | "setup"
  | "encode"
  | "delay1"
  | "recall_immediate"
  | "delay2"
  | "recall_delayed"
  | "results";

export function SequenceDrillTab({
  onMetricSaved,
}: {
  data: TrainingLabData;
  onMetricSaved: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [modality, setModality] = useState<"cards" | "digits">("cards");
  const [length, setLength] = useState(4);
  const [encodeSec, setEncodeSec] = useState(3);
  const [delaySec, setDelaySec] = useState(60);
  const [sequence, setSequence] = useState<SequenceStimulus[]>([]);
  const [encodeIndex, setEncodeIndex] = useState(0);
  const [immediateInput, setImmediateInput] = useState("");
  const [delayedInput, setDelayedInput] = useState("");
  const [immediateSlots, setImmediateSlots] = useState<ParsedSlot[]>([]);
  const [delayedSlots, setDelayedSlots] = useState<ParsedSlot[]>([]);
  const [delayLeft, setDelayLeft] = useState(0);
  const [pending, startTransition] = useTransition();
  const recallStarted = useRef<number>(0);
  const latencies = useRef<number[]>([]);

  useEffect(() => {
    if (phase !== "encode") return;
    if (encodeIndex >= sequence.length) {
      setPhase("delay1");
      setDelayLeft(delaySec);
      return;
    }
    const t = window.setTimeout(() => setEncodeIndex((i) => i + 1), encodeSec * 1000);
    return () => clearTimeout(t);
  }, [phase, encodeIndex, sequence.length, encodeSec, delaySec]);

  useEffect(() => {
    if (phase !== "delay1" && phase !== "delay2") return;
    if (delayLeft <= 0) {
      if (phase === "delay1") {
        setPhase("recall_immediate");
        recallStarted.current = Date.now();
      } else {
        setPhase("recall_delayed");
        recallStarted.current = Date.now();
      }
      return;
    }
    const t = window.setTimeout(() => setDelayLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, delayLeft]);

  function startSession() {
    const seq = generateStimulusSequence({
      modality,
      sequenceLength: length,
      chunkSize: 2,
    });
    setSequence(seq);
    setEncodeIndex(0);
    setImmediateInput("");
    setDelayedInput("");
    setImmediateSlots([]);
    setDelayedSlots([]);
    latencies.current = [];
    setPhase("encode");
  }

  function submitImmediate() {
    const slots =
      modality === "cards"
        ? parseCardsInput(immediateInput, sequence)
        : parseDigitsInput(immediateInput, sequence);
    setImmediateSlots(slots);
    latencies.current = [Math.max(1, Date.now() - recallStarted.current)];
    setPhase("delay2");
    setDelayLeft(delaySec);
  }

  function submitDelayed() {
    const slots =
      modality === "cards"
        ? parseCardsInput(delayedInput, sequence)
        : parseDigitsInput(delayedInput, sequence);
    setDelayedSlots(slots);
    setPhase("results");
  }

  const metrics =
    phase === "results"
      ? computeScoreFromSlots(immediateSlots, delayedSlots, latencies.current)
      : null;

  if (phase === "setup") {
    return (
      <div className="max-w-lg space-y-5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-semibold text-zinc-200">Sequence drill</h2>
        <p className="text-sm text-zinc-500">
          Memorize a short sequence, wait, then recall — immediate and again after a second delay (Alexandria
          training_app protocol).
        </p>
        <div className="flex gap-2">
          {(["cards", "digits"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModality(m)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                modality === m ? "bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/40" : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {m === "cards" ? "Playing cards" : "Numbers 00–99"}
            </button>
          ))}
        </div>
        <label className="block text-xs text-zinc-500">
          Sequence length: {length}
          <input
            type="range"
            min={1}
            max={modality === "cards" ? 12 : 20}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
        <label className="block text-xs text-zinc-500">
          Encode pace: {encodeSec}s per item
          <input
            type="range"
            min={1}
            max={10}
            step={0.5}
            value={encodeSec}
            onChange={(e) => setEncodeSec(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
        <label className="block text-xs text-zinc-500">
          Delay between phases: {delaySec}s
          <input
            type="range"
            min={5}
            max={180}
            step={5}
            value={delaySec}
            onChange={(e) => setDelaySec(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
        <button
          type="button"
          onClick={startSession}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-500"
        >
          Start session
        </button>
      </div>
    );
  }

  if (phase === "encode") {
    const current = sequence[encodeIndex];
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 p-8">
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          Memorize · {encodeIndex + 1} / {sequence.length}
        </p>
        <p className="mt-4 font-mono text-3xl font-bold text-amber-200">{current?.id ?? "…"}</p>
      </div>
    );
  }

  if (phase === "delay1" || phase === "delay2") {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-zinc-800 p-8">
        <p className="text-sm text-zinc-400">Pause before recall</p>
        <p className="mt-2 text-4xl font-bold tabular-nums text-sky-300">{delayLeft}s</p>
        <button
          type="button"
          className="mt-6 text-sm text-zinc-500 underline"
          onClick={() => setDelayLeft(0)}
        >
          Skip wait
        </button>
      </div>
    );
  }

  if (phase === "recall_immediate" || phase === "recall_delayed") {
    const isDelayed = phase === "recall_delayed";
    return (
      <div className="max-w-xl space-y-4 rounded-xl border border-zinc-800 p-5">
        <h2 className="text-sm font-semibold text-zinc-200">
          {isDelayed ? "Delayed recall" : "Immediate recall"}
        </h2>
        <p className="text-xs text-zinc-500">{expectedRecallHint(modality)}</p>
        <textarea
          rows={4}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 font-mono text-sm text-zinc-100"
          value={isDelayed ? delayedInput : immediateInput}
          onChange={(e) => (isDelayed ? setDelayedInput(e.target.value) : setImmediateInput(e.target.value))}
        />
        <button
          type="button"
          onClick={isDelayed ? submitDelayed : submitImmediate}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-zinc-950"
        >
          Submit
        </button>
      </div>
    );
  }

  if (phase === "results" && metrics) {
    return (
      <div className="max-w-xl space-y-4 rounded-xl border border-zinc-800 p-5">
        <h2 className="text-lg font-semibold text-zinc-100">Results</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Result label="Score (norm)" value={`${Math.round(metrics.scoreNorm * 100)}%`} />
          <Result label="Immediate accuracy" value={`${Math.round(metrics.accuracyImmediate * 100)}%`} />
          <Result label="Delayed accuracy" value={`${Math.round(metrics.accuracyDelayed * 100)}%`} />
          <Result label="Retention ratio" value={`${Math.round(metrics.retention * 100)}%`} />
        </dl>
        <p className="font-mono text-xs text-zinc-500">Shown: {sequence.map((s) => s.id).join(modality === "cards" ? " | " : " ")}</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const sessionId = `web-${Date.now()}`;
                await saveSequenceMetricAction({
                  sessionId,
                  modality,
                  scoreNorm: metrics.scoreNorm,
                  accImmediate: metrics.accuracyImmediate,
                  accDelayed: metrics.accuracyDelayed,
                  retention: metrics.retention,
                  sequenceLength: length,
                });
                onMetricSaved();
              })
            }
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700 disabled:opacity-50"
          >
            Save to history
          </button>
          <button type="button" onClick={() => setPhase("setup")} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm">
            New session
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-950/80 px-3 py-2 ring-1 ring-zinc-800">
      <dt className="text-[10px] uppercase text-zinc-500">{label}</dt>
      <dd className="text-lg font-semibold text-zinc-100">{value}</dd>
    </div>
  );
}
