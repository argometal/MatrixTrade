"use client";

import { useMemo, useState, useTransition } from "react";
import {
  addTrainingPairAction,
  createTrainingDeckAction,
  deleteTrainingDeckAction,
  deleteTrainingPairAction,
  getTrainingLabDataAction,
  renameTrainingDeckAction,
  seedMockTrainingDeckAction,
} from "@/app/forge/lab/actions";
import { loadDeckOverview } from "@/lib/argusforge/training-lab/match-logic";
import type { TrainingLabData } from "@/lib/argusforge/training-lab/types";
import { MatchSessionView } from "./MatchSessionView";

export function MatchDecksTab({
  data,
  onDataChange,
}: {
  data: TrainingLabData;
  onDataChange: (d: TrainingLabData) => void;
}) {
  const [deckId, setDeckId] = useState(() => {
    const playable = data.decks.find((d) => data.pairs.some((p) => p.deckId === d.id));
    return playable?.id ?? data.decks[0]?.id ?? "";
  });
  const [playing, setPlaying] = useState(false);
  const [pending, startTransition] = useTransition();
  const [newDeckName, setNewDeckName] = useState("");
  const [rename, setRename] = useState("");

  const deck = data.decks.find((d) => d.id === deckId) ?? data.decks[0];
  const pairs = useMemo(
    () => data.pairs.filter((p) => p.deckId === deck?.id),
    [data.pairs, deck?.id],
  );
  const overview = deck
    ? loadDeckOverview(data.pairs, data.pairStates, deck.id)
    : null;

  async function reload() {
    onDataChange(await getTrainingLabDataAction());
  }

  if (playing && deck) {
    return (
      <MatchSessionView
        key={`${deck.id}-${playing}`}
        deck={deck}
        decks={data.decks}
        pairs={pairs}
        states={data.pairStates}
        onExit={() => setPlaying(false)}
        onStateChange={reload}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Decks</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Active deck
            <select
              value={deck?.id ?? ""}
              onChange={(e) => setDeckId(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            >
              {data.decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                await createTrainingDeckAction(newDeckName);
                setNewDeckName("");
                await reload();
              });
            }}
          >
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              New deck
              <input
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                placeholder="e.g. Russian nouns"
              />
            </label>
            <button
              type="submit"
              disabled={pending || !newDeckName.trim()}
              className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
            >
              Add
            </button>
          </form>
          {deck ? (
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  await renameTrainingDeckAction(deck.id, rename || deck.name);
                  await reload();
                });
              }}
            >
              <label className="flex flex-col gap-1 text-xs text-zinc-500">
                Rename
                <input
                  value={rename}
                  onChange={(e) => setRename(e.target.value)}
                  placeholder={deck.name}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                />
              </label>
              <button type="submit" disabled={pending} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm">
                Save
              </button>
            </form>
          ) : null}
          <button
            type="button"
            disabled={pending}
            className="rounded-lg border border-amber-900/40 px-3 py-2 text-sm text-amber-200/90 hover:bg-amber-950/30"
            onClick={() =>
              startTransition(async () => {
                const next = await seedMockTrainingDeckAction();
                onDataChange(next);
                const mock = next.decks.find((d) => d.name === "Mock loci");
                if (mock) setDeckId(mock.id);
              })
            }
          >
            Load mock deck
          </button>
          {deck && data.decks.length > 1 ? (
            <button
              type="button"
              disabled={pending}
              className="rounded-lg border border-red-900/50 px-3 py-2 text-sm text-red-300 hover:bg-red-950/40"
              onClick={() =>
                startTransition(async () => {
                  await deleteTrainingDeckAction(deck.id);
                  await reload();
                  setDeckId(data.decks[0]?.id ?? "");
                })
              }
            >
              Delete deck
            </button>
          ) : null}
        </div>
        {overview ? (
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label="Pairs" value={String(overview.pairCount)} />
            <Stat label="Due now" value={String(overview.dueCount)} />
            <Stat
              label="Match rate"
              value={overview.matchRatePercent != null ? `${overview.matchRatePercent}%` : "—"}
            />
            <Stat label="Attempts" value={`${overview.sumPass + overview.sumFail}`} />
          </dl>
        ) : null}
        <button
          type="button"
          disabled={pairs.length < 2}
          onClick={() => setPlaying(true)}
          className="mt-4 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-500 disabled:opacity-40"
        >
          Start match session
        </button>
        {pairs.length < 2 ? (
          <p className="mt-2 text-xs text-zinc-500">Add at least two image–word pairs to play.</p>
        ) : null}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Add pair</h2>
        {deck ? (
          <form
            className="mt-3 grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              fd.set("deckId", deck.id);
              startTransition(async () => {
                const res = await addTrainingPairAction(fd);
                if (res.ok) {
                  e.currentTarget.reset();
                  await reload();
                } else {
                  alert(res.error);
                }
              });
            }}
          >
            <label className="flex flex-col gap-1 text-xs text-zinc-500 sm:col-span-2">
              Image
              <input name="image" type="file" accept="image/*" required className="text-sm text-zinc-300" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Word / lemma
              <input name="captionText" required className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Transliteration (optional)
              <input name="transliteration" className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500 sm:col-span-2">
              Gloss (optional)
              <input name="gloss" className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="sm:col-span-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium hover:bg-zinc-700 disabled:opacity-50"
            >
              Save pair
            </button>
          </form>
        ) : null}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-zinc-200">Pairs in deck</h2>
        {pairs.length === 0 ? (
          <p className="text-sm text-zinc-500">No pairs yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
            {pairs.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/forge/lab/image/${p.id}`}
                  alt=""
                  className="h-12 w-12 rounded object-cover bg-zinc-800"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-100">{p.captionText}</p>
                  {p.transliteration ? (
                    <p className="truncate text-xs text-zinc-500">{p.transliteration}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="text-xs text-red-400 hover:text-red-300"
                  onClick={() =>
                    startTransition(async () => {
                      await deleteTrainingPairAction(p.id);
                      await reload();
                    })
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-950/80 px-3 py-2 ring-1 ring-zinc-800">
      <dt className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="text-lg font-semibold text-zinc-100">{value}</dd>
    </div>
  );
}
