"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Af03ImageBlockPayload } from "@/lib/argusforge/af03-builder-types";
import { listBlocksForFragment } from "@/lib/argusforge/af03-builder-store";
import {
  deckHref,
  emptyOrSeedRepo,
  getDeck,
  getItem,
  itemHref,
  listItemsInDeck,
  viewHref,
} from "@/lib/argusforge/af03-repo-store";
import type { Af03RepoState } from "@/lib/argusforge/af03-repo-types";
import { fragmentModeHref } from "@/lib/argusforge/af03-entity-path";
import { ChaosAssetImage } from "./ChaosAssetImage";
import { FragmentModeSwitch } from "./EntityLocationNav";
import { SimpleMarkdown } from "./SimpleMarkdown";

type Props = {
  deckId: string;
  itemId: string;
};

/**
 * AF03 §9 — Clear Viewer (not Alexandria).
 * Reading-first; no grades, SRS, Locus, Parcour, or evaluation.
 */
export function ContentViewer({ deckId, itemId }: Props) {
  const [state, setState] = useState<Af03RepoState | null>(null);

  useEffect(() => {
    setState(emptyOrSeedRepo());
  }, [deckId, itemId]);

  const deck = state ? getDeck(state, deckId) : undefined;
  const item = state ? getItem(state, itemId) : undefined;
  const siblings = useMemo(
    () => (state ? listItemsInDeck(state, deckId) : []),
    [state, deckId]
  );
  const idx = siblings.findIndex((i) => i.id === itemId);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  if (!state) {
    return <p className="text-sm text-zinc-500">Loading viewer…</p>;
  }

  if (!item || item.deckId !== deckId) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-rose-300">
          Content not found.
        </p>
        <Link href={deckHref(deckId)} className="text-sm text-zinc-300 underline">
          Back to deck
        </Link>
      </div>
    );
  }

  const isLink = item.kind === "link" || /^https?:\/\//i.test(item.body.trim());
  const isImageUrl =
    item.kind === "image" ||
    /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(item.body.trim()) ||
    item.body.trim().startsWith("data:image/");
  const blocks = listBlocksForFragment(state, item.id);
  const imageBlocks = blocks.filter((b) => b.type === "image");
  const textBlocks = blocks.filter((b) => b.type === "text");
  const hasAssetImages = imageBlocks.length > 0;

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-5">
      <header className="flex items-center gap-2">
        <Link
          href={deckHref(deckId)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-slate-500 hover:bg-white"
          aria-label="Back to deck"
        >
          ‹
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {deck?.title ?? "Deck"}
          </p>
          <h2 className="truncate text-[18px] font-semibold text-slate-900">{item.title}</h2>
        </div>
        <FragmentModeSwitch deckId={deckId} fragmentId={itemId} mode="viewer" />
      </header>

      {item.unsupported ? (
        <p role="status" className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Stub — {item.unsupportedReason || "binary not stored"}.
        </p>
      ) : null}

      <article className="min-h-[min(70vh,40rem)] space-y-4 rounded-2xl bg-white px-6 py-8 shadow-sm">
        <h3 className="text-2xl font-semibold leading-snug text-slate-900">{item.title}</h3>
        {hasAssetImages ? (
          <>
            {textBlocks.length > 0 || item.body.trim() ? (
              <div className="space-y-2">
                {textBlocks.length > 0
                  ? textBlocks.map((b) => (
                      <SimpleMarkdown
                        key={b.id}
                        source={
                          (b.payload as { text?: string }).text || "_Empty._"
                        }
                      />
                    ))
                  : item.body.trim()
                    ? <SimpleMarkdown source={item.body} />
                    : null}
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {imageBlocks.map((b) => {
                const payload = b.payload as Af03ImageBlockPayload;
                return (
                  <ChaosAssetImage
                    key={b.id}
                    assetId={payload.assetId}
                    alt={payload.alt || item.title}
                    className="max-h-[28rem] w-full rounded-lg object-contain"
                  />
                );
              })}
            </div>
          </>
        ) : isImageUrl && !item.unsupported ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.body.trim()}
            alt={item.title}
            className="max-h-[32rem] w-full rounded-lg object-contain"
          />
        ) : isLink && item.kind === "link" ? (
          <div className="space-y-3">
            <a
              href={item.body.trim()}
              target="_blank"
              rel="noreferrer"
              className="break-all text-sky-400 underline underline-offset-2"
            >
              {item.body.trim()}
            </a>
            {item.sourceRef && item.sourceRef !== item.body.trim() ? (
              <p className="text-xs text-zinc-500">Source ref: {item.sourceRef}</p>
            ) : null}
          </div>
        ) : (
          <SimpleMarkdown source={item.body || "_Empty._"} />
        )}
      </article>

      <nav aria-label="Adjacent content" className="flex items-center justify-between gap-2">
        {prev ? (
          <Link
            href={viewHref(deckId, prev.id)}
            className="min-h-11 rounded-xl bg-white px-4 text-sm font-medium text-slate-700 shadow-sm"
          >
            ‹ Prev
          </Link>
        ) : (
          <span />
        )}
        <span className="text-xs text-slate-400">
          {idx + 1} / {siblings.length}
        </span>
        {next ? (
          <Link
            href={viewHref(deckId, next.id)}
            className="min-h-11 rounded-xl bg-[#2f80ed] px-4 text-sm font-semibold text-white"
          >
            Next ›
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <div className="flex flex-wrap gap-2">
        <Link
          href={fragmentModeHref(deckId, itemId, "classic")}
          className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-medium text-slate-800 shadow-sm"
        >
          Classic
        </Link>
        <Link
          href={itemHref(deckId, itemId)}
          className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-medium text-slate-800 shadow-sm"
        >
          Builder
        </Link>
        <Link
          href={deckHref(deckId)}
          className="inline-flex min-h-11 items-center px-4 text-sm text-slate-400"
        >
          Deck
        </Link>
      </div>
    </div>
  );
}
