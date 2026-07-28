"use client";

/**
 * CHANGE 24-1C — Progressive Chaos Fragment builder (B0 vertical slice).
 * Text + image blocks, IndexedDB assets, move up/down, mobile-first.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Af03ImageBlockPayload, Af03TextBlockPayload } from "@/lib/argusforge/af03-builder-types";
import {
  addImageBlockFromFile,
  addTextBlock,
  listBlocksForFragment,
  moveBlockOrder,
  removeBlock,
  updateTextBlock,
} from "@/lib/argusforge/af03-builder-store";
import {
  chaosAssetsAvailability,
  createObjectUrl,
  revokeObjectUrl,
} from "@/lib/argusforge/af03-chaos-assets-idb";
import {
  deckHref,
  emptyOrSeedRepo,
  getItem,
  itemHref,
  removeContent,
  updateContent,
  viewHref,
} from "@/lib/argusforge/af03-repo-store";
import type { Af03Block, Af03RepoState } from "@/lib/argusforge/af03-repo-types";
import { AF_TEXT } from "@/lib/argusforge/af03-visible-ontology";
import { Af03RepoDisclosure } from "./Af03RepoDisclosure";
import {
  EntityLocationBreadcrumb,
  FragmentModeSwitch,
} from "./EntityLocationNav";

type Props = {
  deckId: string;
  itemId: string;
};

function ImagePreview({ assetId }: { assetId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    const avail = chaosAssetsAvailability();
    if (!avail.ok) {
      setError(avail.reason);
      return;
    }
    createObjectUrl(assetId)
      .then((u) => {
        if (!active) {
          if (u) revokeObjectUrl(u);
          return;
        }
        if (!u) {
          setError("Image asset missing from IndexedDB (non-destructive)");
          return;
        }
        objectUrl = u;
        setUrl(u);
      })
      .catch((e) => {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load image");
        }
      });
    return () => {
      active = false;
      if (objectUrl) revokeObjectUrl(objectUrl);
    };
  }, [assetId]);

  if (error) {
    return (
      <p role="alert" className="rounded-md border border-amber-900/60 bg-amber-950/40 px-3 py-2 text-xs text-amber-100">
        {error}
      </p>
    );
  }
  if (!url) {
    return <p className="text-xs text-zinc-500">Loading image…</p>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="max-h-64 w-full rounded-md object-contain bg-zinc-900" />
  );
}

export function FragmentBuilder({ deckId, itemId }: Props) {
  const [state, setState] = useState<Af03RepoState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setState(emptyOrSeedRepo());
  }, [deckId, itemId]);

  const fragment = state ? getItem(state, itemId) : undefined;
  const blocks: Af03Block[] = state ? listBlocksForFragment(state, itemId) : [];

  if (!state) {
    return <p className="text-sm text-zinc-500">Loading Fragment builder…</p>;
  }

  if (!fragment || fragment.deckId !== deckId) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-rose-300">
          Fragment not found.
        </p>
        <Link href={deckHref(deckId)} className="text-sm text-zinc-300 underline">
          Back to Chaos Deck
        </Link>
      </div>
    );
  }

  async function onPickImage(fileList: FileList | null) {
    if (!fileList?.[0] || !state) return;
    setBusy(true);
    setNotice(null);
    const result = await addImageBlockFromFile(state, itemId, fileList[0]);
    setBusy(false);
    if ("error" in result) {
      setNotice(result.error);
      return;
    }
    setState(result.state);
  }

  return (
    <div className="min-w-0 space-y-4 pb-6">
      <Af03RepoDisclosure compact />
      <EntityLocationBreadcrumb state={state} deckId={deckId} fragmentId={itemId} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`text-[10px] uppercase tracking-wide ${AF_TEXT.metadata}`}>Fragment</p>
        <FragmentModeSwitch deckId={deckId} fragmentId={itemId} mode="builder" />
      </div>

      <div>
        <input
          className="mt-1 w-full min-h-11 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-100"
          value={fragment.title}
          aria-label="Fragment title"
          onChange={(e) => setState(updateContent(state, itemId, { title: e.target.value }))}
        />
      </div>

      {notice ? (
        <p role="alert" className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
          {notice}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className="min-h-11 min-w-11 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-100 sm:flex-none"
          onClick={() => {
            const result = addTextBlock(state, itemId, "");
            if (result) setState(result.state);
          }}
        >
          Add text block
        </button>
        <label className="min-h-11 flex-1 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-100 inline-flex items-center justify-center sm:flex-none">
          {busy ? "Adding image…" : "Add image"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              void onPickImage(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          disabled={busy}
          className="min-h-11 rounded-lg border border-rose-900/60 px-3 text-sm font-medium text-rose-300 sm:flex-none"
          onClick={() => {
            if (
              !window.confirm(
                `Delete Fragment “${fragment.title}” and its blocks? This cannot be undone.`
              )
            ) {
              return;
            }
            setState(removeContent(state, itemId));
            window.location.href = deckHref(deckId);
          }}
        >
          Delete Fragment…
        </button>
      </div>

      {blocks.length === 0 ? (
        <p className={`text-sm ${AF_TEXT.metadata}`}>
          No blocks yet. Add text or an image. Order with Move up / Move down.
        </p>
      ) : (
        <ul className="space-y-3">
          {blocks.map((block, index) => (
            <li
              key={block.id}
              className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                  Block · {block.type} · {index + 1}/{blocks.length}
                </span>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="min-h-11 min-w-11 rounded-md border border-zinc-700 px-2 text-xs text-zinc-200"
                    disabled={index === 0}
                    onClick={() => setState(moveBlockOrder(state, block.id, "up"))}
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    className="min-h-11 min-w-11 rounded-md border border-zinc-700 px-2 text-xs text-zinc-200"
                    disabled={index === blocks.length - 1}
                    onClick={() => setState(moveBlockOrder(state, block.id, "down"))}
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    className="min-h-11 min-w-11 rounded-md border border-zinc-700 px-2 text-xs text-rose-200"
                    onClick={() => setState(removeBlock(state, block.id))}
                  >
                    Remove
                  </button>
                </div>
              </div>

              {block.type === "text" ? (
                <textarea
                  className="min-h-28 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  value={(block.payload as Af03TextBlockPayload).text}
                  aria-label={`Text block ${index + 1}`}
                  onChange={(e) => setState(updateTextBlock(state, block.id, e.target.value))}
                />
              ) : (
                <div className="space-y-2">
                  <ImagePreview assetId={(block.payload as Af03ImageBlockPayload).assetId} />
                </div>
              )}
              <p className={`mt-1 text-[10px] ${AF_TEXT.disabled}`}>Block</p>
            </li>
          ))}
        </ul>
      )}

      <p className={`text-xs ${AF_TEXT.metadata}`}>
        Also available:{" "}
        <Link href={`${itemHref(deckId, itemId)}?legacy=1`} className={`underline ${AF_TEXT.metadata}`}>
          Classic editor
        </Link>{" "}
        ·{" "}
        <Link href={viewHref(deckId, itemId)} className={`underline ${AF_TEXT.metadata}`}>
          Viewer
        </Link>
        .
      </p>
    </div>
  );
}
