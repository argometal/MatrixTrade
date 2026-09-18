"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { recordTrainingMatchOutcomeAction } from "@/app/forge/lab/actions";
import { pickPairsForSession } from "@/lib/argus/lab/match-logic";
import type { TrainingLabDeck, TrainingLabPair, TrainingLabPairState } from "@/lib/argus/lab/types";

type Tile = {
  key: string;
  pairId: string;
  isImage: boolean;
  caption: string;
  transliteration?: string;
};

export function MatchSessionView({
  deck,
  decks,
  pairs,
  states,
  onExit,
  onStateChange,
}: {
  deck: TrainingLabDeck;
  decks: TrainingLabDeck[];
  pairs: TrainingLabPair[];
  states: TrainingLabPairState[];
  onExit: () => void;
  onStateChange: () => Promise<void>;
}) {
  const [roundKey, setRoundKey] = useState(0);
  const [selA, setSelA] = useState<number | null>(null);
  const [selB, setSelB] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [, startTransition] = useTransition();

  const sessionPairs = useMemo(
    () => pickPairsForSession(pairs, states, deck.id, 8),
    // Freeze the board for the round. Reloading Fib state mid-session must not reshuffle tiles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deck.id, roundKey],
  );

  const tiles: Tile[] = useMemo(() => {
    const out: Tile[] = [];
    for (const p of sessionPairs) {
      out.push({
        key: `${p.id}-img`,
        pairId: p.id,
        isImage: true,
        caption: p.captionText,
        transliteration: p.transliteration,
      });
      out.push({
        key: `${p.id}-txt`,
        pairId: p.id,
        isImage: false,
        caption: p.captionText,
        transliteration: p.transliteration,
      });
    }
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }, [sessionPairs]);

  const [visible, setVisible] = useState<Tile[]>(() => tiles);
  const [boardReady, setBoardReady] = useState(false);

  const resetRound = useCallback(() => {
    setRoundKey((k) => k + 1);
    setSelA(null);
    setSelB(null);
    setBusy(false);
    setAttempts(0);
    setBoardReady(false);
  }, []);

  useEffect(() => {
    setVisible(tiles);
    setSelA(null);
    setSelB(null);
    setBusy(false);
    setBoardReady(true);
  }, [tiles]);

  const won = boardReady && visible.length === 0 && sessionPairs.length > 0;

  async function onTap(index: number) {
    if (busy || visible.length === 0) return;
    if (selB != null) return;

    if (selA == null) {
      setSelA(index);
      return;
    }
    if (selA === index) {
      setSelA(null);
      return;
    }

    const a = selA;
    const b = index;
    setSelB(b);
    setBusy(true);
    setAttempts((n) => n + 1);

    const ta = visible[a];
    const tb = visible[b];
    const ok = ta.pairId === tb.pairId && ta.isImage !== tb.isImage;

    if (ok) {
      startTransition(async () => {
        await recordTrainingMatchOutcomeAction(ta.pairId, true);
      });
      setVisible((prev) => {
        const hi = Math.max(a, b);
        const lo = Math.min(a, b);
        const next = [...prev];
        next.splice(hi, 1);
        next.splice(lo, 1);
        return next;
      });
      setSelA(null);
      setSelB(null);
      setBusy(false);
      return;
    }

    startTransition(async () => {
      await recordTrainingMatchOutcomeAction(ta.pairId, false);
      if (ta.pairId !== tb.pairId) {
        await recordTrainingMatchOutcomeAction(tb.pairId, false);
      }
    });

    window.setTimeout(() => {
      setSelA(null);
      setSelB(null);
      setBusy(false);
    }, 650);
  }

  if (sessionPairs.length < 2) {
    return (
      <div className="rounded-xl border border-zinc-800 p-6 text-center">
        <p className="text-zinc-400">Need at least two pairs in this deck.</p>
        <button type="button" onClick={onExit} className="mt-4 text-sm text-amber-400">
          Back
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Match session</h2>
          <p className="text-sm text-zinc-500">{deck.name}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={resetRound} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm">
            New round
          </button>
          <button
            type="button"
            onClick={() => {
              onExit();
              void onStateChange();
            }}
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm"
          >
            Done
          </button>
        </div>
      </div>
      <p className="mb-3 text-sm text-zinc-400">
        Attempts: {attempts} · Pairs left: {visible.length / 2}
        {won ? (
          <span className="ml-2 font-semibold text-amber-400">Round complete</span>
        ) : null}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {visible.map((t, i) => {
          const selected = selA === i || selB === i;
          return (
            <button
              key={t.key}
              type="button"
              disabled={busy}
              onClick={() => void onTap(i)}
              className={`aspect-[4/5] overflow-hidden rounded-xl border-2 bg-zinc-900 transition ${
                selected ? "border-amber-400" : "border-transparent ring-1 ring-zinc-800"
              }`}
            >
              {t.isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/forge/lab/image/${t.pairId}`}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-2 text-center">
                  <span className="text-base font-semibold leading-tight text-zinc-100">{t.caption}</span>
                  {t.transliteration ? (
                    <span className="mt-1 text-xs italic text-zinc-500">{t.transliteration}</span>
                  ) : null}
                </div>
              )}
            </button>
          );
        })}
      </div>
      {decks.length > 1 ? (
        <p className="mt-4 text-xs text-zinc-600">Switch decks from the deck list when you exit the session.</p>
      ) : null}
    </div>
  );
}
