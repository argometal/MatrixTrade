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
import { Af03RepoDisclosure } from "./Af03RepoDisclosure";
import { ChaosAssetImage } from "./ChaosAssetImage";
import {
  EntityLocationBreadcrumb,
  FragmentModeSwitch,
} from "./EntityLocationNav";
import { ForgeOverflowMenu } from "./ForgeOverflowMenu";
import { SimpleMarkdown } from "./SimpleMarkdown";
import { AF_TEXT } from "@/lib/argusforge/af03-visible-ontology";

type Props = {
  deckId: string;
  itemId: string;
};

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/**
 * AF03 §9 — Clear Viewer (not Alexandria).
 * Reading-first; no grades, SRS, Locus, Parcour, or evaluation.
 */
export function ContentViewer({ deckId, itemId }: Props) {
  const [state, setState] = useState<Af03RepoState | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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
    <div className="min-w-0 space-y-5">
      <Af03RepoDisclosure compact />
      <EntityLocationBreadcrumb state={state} deckId={deckId} fragmentId={itemId} />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-50">{item.title}</h2>
          <p className={`mt-1 text-[11px] uppercase tracking-wide ${AF_TEXT.metadata}`}>
            {item.markedForLater ? "Marked for later" : "Fragment"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <FragmentModeSwitch deckId={deckId} fragmentId={itemId} mode="viewer" />
          <ForgeOverflowMenu
            open={menuOpen}
            onOpenChange={setMenuOpen}
            label="Viewer menu"
            triggerClassName="min-h-10 min-w-10 rounded-lg border border-zinc-800 text-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            items={[
              {
                id: "edit",
                label: "Builder",
                onClick: () => {
                  window.location.href = itemHref(deckId, itemId);
                },
              },
              {
                id: "back",
                label: "Back to Deck",
                onClick: () => {
                  window.location.href = deckHref(deckId);
                },
              },
            ]}
          />
        </div>
      </div>

      {item.unsupported ? (
        <p role="status" className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-100/90">
          Stub — {item.unsupportedReason || "binary not stored"}. Source preserved
          {item.sourceRef ? `: ${item.sourceRef}` : ""}.
        </p>
      ) : null}

      <article className="min-h-[12rem] space-y-4 rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-4 py-5">
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

      <dl className="grid grid-cols-2 gap-2 text-xs text-zinc-500">
        <div>
          <dt>Created</dt>
          <dd className="text-zinc-300">{formatTime(item.createdAt)}</dd>
        </div>
        <div>
          <dt>Modified</dt>
          <dd className="text-zinc-300">{formatTime(item.updatedAt)}</dd>
        </div>
      </dl>

      <nav aria-label="Adjacent content" className="flex items-center justify-between gap-2">
        {prev ? (
          <Link
            href={viewHref(deckId, prev.id)}
            className="min-h-11 rounded-lg border border-zinc-800 px-3 text-sm text-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            ‹ Prev
          </Link>
        ) : (
          <span />
        )}
        <span className="text-xs text-zinc-600">
          {idx + 1} / {siblings.length}
        </span>
        {next ? (
          <Link
            href={viewHref(deckId, next.id)}
            className="min-h-11 rounded-lg border border-zinc-800 px-3 text-sm text-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            Next ›
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <div className="flex flex-wrap gap-2">
        <Link
          href={itemHref(deckId, itemId)}
          className="inline-flex min-h-11 items-center rounded-lg border border-zinc-700 px-4 text-sm font-medium text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          Edit
        </Link>
        <Link
          href={deckHref(deckId)}
          className="inline-flex min-h-11 items-center rounded-lg border border-zinc-800 px-4 text-sm text-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          Deck
        </Link>
      </div>
    </div>
  );
}
