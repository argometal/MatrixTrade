"use client";

/**
 * CHANGE 24-1C — Progressive Chaos Fragment builder (B0 vertical slice).
 * Text + image blocks, IndexedDB assets, move up/down, mobile-first.
 */

import Link from "next/link";
import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from "react";
import type { Af03ImageBlockPayload, Af03TextBlockPayload } from "@/lib/argusforge/af03-builder-types";
import {
  addTextBlock,
  insertImageBlockFromFile,
  listBlocksForFragment,
  moveBlockOrder,
  removeBlock,
  removeImageAndMergeParagraphs,
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
  removeContent,
  updateContent,
} from "@/lib/argusforge/af03-repo-store";
import type { Af03Block, Af03RepoState } from "@/lib/argusforge/af03-repo-types";
import { AF_TEXT } from "@/lib/argusforge/af03-visible-ontology";
import { Af03RepoDisclosure } from "./Af03RepoDisclosure";
import {
  EntityLocationBreadcrumb,
  FragmentModeSwitch,
} from "./EntityLocationNav";
import { filesFromDrop, filesFromPaste } from "./MaterialImageAttach";

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
    <img src={url} alt="" className="max-h-[min(70vh,40rem)] w-full rounded-md bg-zinc-900 object-contain" />
  );
}

export function FragmentBuilder({ deckId, itemId }: Props) {
  const [state, setState] = useState<Af03RepoState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [chromeOpen, setChromeOpen] = useState(false);
  const [titleOpen, setTitleOpen] = useState(false);
  const caret = useRef<{ textBlockId: string; offset: number } | null>(null);
  const textRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

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

  async function addImageFiles(files: File[], split?: { textBlockId: string; offset: number } | null) {
    if (!state || files.length === 0) return;
    setBusy(true);
    setNotice(null);
    let repo = state;
    let at = split ?? caret.current;
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const result = await insertImageBlockFromFile(repo, itemId, file, at);
      if ("error" in result) {
        setNotice(result.error);
        setState(repo);
        setBusy(false);
        return;
      }
      repo = result.state;
      at = { afterBlockId: result.block.id };
    }
    setState(repo);
    setBusy(false);
  }

  async function onPickImage(fileList: FileList | null) {
    await addImageFiles(fileList ? Array.from(fileList) : []);
  }

  function deleteImage(blockId: string) {
    const result = removeImageAndMergeParagraphs(state, blockId);
    setState(result.state);
    const focusId = result.mergedTextBlockId;
    if (!focusId) return;
    requestAnimationFrame(() => {
      const node = textRefs.current[focusId];
      if (!node) return;
      node.focus();
      node.setSelectionRange(result.caretOffset, result.caretOffset);
      caret.current = { textBlockId: focusId, offset: result.caretOffset };
    });
  }

  function onTextKeyDown(blockId: string, e: KeyboardEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    caret.current = { textBlockId: blockId, offset: el.selectionStart };
    if (el.selectionStart !== el.selectionEnd) return;
    const idx = blocks.findIndex((b) => b.id === blockId);
    if (idx < 0) return;
    if (e.key === "Backspace" && el.selectionStart === 0) {
      const prev = blocks[idx - 1];
      if (prev?.type === "image") {
        e.preventDefault();
        deleteImage(prev.id);
      }
      return;
    }
    if (e.key === "Delete" && el.selectionStart === el.value.length) {
      const next = blocks[idx + 1];
      if (next?.type === "image") {
        e.preventDefault();
        deleteImage(next.id);
      }
    }
  }

  return (
    <div
        className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3 pb-6"
        onPasteCapture={(e: ClipboardEvent<HTMLDivElement>) => {
          const files = filesFromPaste(e);
          if (files.length === 0) return;
          e.preventDefault();
          void addImageFiles(files);
        }}
        onDragOver={(e: DragEvent<HTMLDivElement>) => e.preventDefault()}
        onDrop={(e: DragEvent<HTMLDivElement>) => {
          const files = filesFromDrop(e);
          if (files.length) void addImageFiles(files);
        }}
      >
        <div className="sticky top-0 z-10 flex flex-nowrap items-center justify-between gap-2 bg-[#f4f6f8] py-1">
          <Link
            href={deckHref(deckId)}
            className="text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            ‹ Deck
          </Link>
          <div className="flex shrink-0 flex-nowrap items-center gap-2">
            <button
              type="button"
              className={`min-h-10 shrink-0 rounded-lg border px-3 text-sm font-medium ${
                chromeOpen
                  ? "border-[#2f80ed] bg-[#e8f2ff] text-[#2f80ed]"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
              aria-expanded={chromeOpen}
              aria-pressed={chromeOpen}
              onClick={() => setChromeOpen((v) => !v)}
            >
              Tools
            </button>
            <FragmentModeSwitch deckId={deckId} fragmentId={itemId} mode="builder" />
          </div>
        </div>

        {chromeOpen ? (
          <>
            <Af03RepoDisclosure compact />
            <EntityLocationBreadcrumb state={state} deckId={deckId} fragmentId={itemId} />
          </>
        ) : null}

        {titleOpen || fragment.title.trim() ? (
          <div>
            <input
              className="mt-1 min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-100"
              value={fragment.title}
              aria-label="Fragment title (optional)"
              placeholder="Title (optional)"
              onChange={(e) => setState(updateContent(state, itemId, { title: e.target.value }))}
            />
          </div>
        ) : (
          <button
            type="button"
            className="self-start text-sm font-medium text-slate-400 hover:text-slate-600"
            onClick={() => setTitleOpen(true)}
          >
            Add title (optional)
          </button>
        )}

        {notice ? (
          <p role="alert" className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
            {notice}
          </p>
        ) : null}

        {chromeOpen ? (
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
            <label className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-100 sm:flex-none">
              {busy ? "Adding image…" : "Add image"}
              <input
                type="file"
                accept="image/*"
                multiple
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
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-100"
              onClick={() => {
                const result = addTextBlock(state, itemId, "");
                if (result) setState(result.state);
              }}
            >
              + Text
            </button>
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-100">
              + Image
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={busy}
                onChange={(e) => {
                  void onPickImage(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        )}

        {blocks.length === 0 ? (
          <p className={`text-sm ${AF_TEXT.metadata}`}>
            No blocks yet. Add text or an image.
          </p>
        ) : (
          <ul className="space-y-4">
            {blocks.map((block, index) => (
              <li
                key={block.id}
                className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                    Block · {block.type} · {index + 1}/{blocks.length}
                  </span>
                  {chromeOpen ? (
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
                        onClick={() =>
                          block.type === "image"
                            ? deleteImage(block.id)
                            : setState(removeBlock(state, block.id))
                        }
                      >
                        {block.type === "image" ? "Delete" : "Remove"}
                      </button>
                    </div>
                  ) : null}
                </div>

                {block.type === "text" ? (
                  <textarea
                    ref={(el) => {
                      textRefs.current[block.id] = el;
                    }}
                    className="min-h-[min(52vh,32rem)] w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-4 text-base leading-relaxed text-zinc-100"
                    value={(block.payload as Af03TextBlockPayload).text}
                    aria-label={`Text block ${index + 1}`}
                    onChange={(e) => {
                      caret.current = { textBlockId: block.id, offset: e.currentTarget.selectionStart };
                      setState(updateTextBlock(state, block.id, e.target.value));
                    }}
                    onSelect={(e) => {
                      caret.current = { textBlockId: block.id, offset: e.currentTarget.selectionStart };
                    }}
                    onKeyDown={(e) => onTextKeyDown(block.id, e)}
                    onPaste={(e: ClipboardEvent<HTMLTextAreaElement>) => {
                      const files = filesFromPaste(e);
                      if (files.length === 0) return;
                      e.preventDefault();
                      caret.current = { textBlockId: block.id, offset: e.currentTarget.selectionStart };
                      void addImageFiles(files, caret.current);
                    }}
                  />
                ) : (
                  <div className="relative space-y-2">
                    <ImagePreview assetId={(block.payload as Af03ImageBlockPayload).assetId} />
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 shadow-sm"
                      aria-label="Delete image"
                      onClick={() => deleteImage(block.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
  );
}
