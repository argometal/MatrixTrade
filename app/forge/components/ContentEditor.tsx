"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from "react";
import type { Af03ImageBlockPayload, Af03TextBlockPayload } from "@/lib/argusforge/af03-builder-types";
import {
  ensureFragmentTextBlock,
  insertImageBlockFromFile,
  listBlocksForFragment,
  removeImageAndMergeParagraphs,
  updateTextBlock,
  type ImageInsertCaret,
} from "@/lib/argusforge/af03-builder-store";
import {
  deckHref,
  emptyOrSeedRepo,
  getDeck,
  getItem,
  updateContent,
} from "@/lib/argusforge/af03-repo-store";
import type { Af03Block, Af03RepoState } from "@/lib/argusforge/af03-repo-types";
import { ChaosAssetImage } from "./ChaosAssetImage";
import { FragmentModeSwitch } from "./EntityLocationNav";
import { filesFromDrop, filesFromPaste, MaterialImageAttach } from "./MaterialImageAttach";

type Props = {
  deckId: string;
  itemId: string;
};

const LEGACY_IMAGE_MD = /!\[alt\]\(https:\/\/example\.com\/image\.png\)\s*/g;

function stripLegacyImageMarkdown(text: string): string {
  return text.replace(LEGACY_IMAGE_MD, "");
}

/**
 * Classic document = ordered Chaos blocks (text | image), same stack as
 * Alexandria locus body (p / img). Inserting an image splits the paragraph
 * at the caret. Not an Alexandria object.
 */
export function ContentEditor({ deckId, itemId }: Props) {
  const [state, setState] = useState<Af03RepoState | null>(null);
  const [title, setTitle] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const [titleOpen, setTitleOpen] = useState(false);
  const [chromeOpen, setChromeOpen] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageNotice, setImageNotice] = useState<string | null>(null);
  const dirty = useRef(false);
  const baselineTitle = useRef("");
  const caret = useRef<{ textBlockId: string; offset: number } | null>(null);
  const textRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  useEffect(() => {
    let repo = emptyOrSeedRepo();
    const item = getItem(repo, itemId);
    if (item && item.deckId === deckId) {
      repo = ensureFragmentTextBlock(repo, itemId, stripLegacyImageMarkdown(item.body));
      for (const block of listBlocksForFragment(repo, itemId)) {
        if (block.type !== "text") continue;
        const raw = (block.payload as Af03TextBlockPayload).text ?? "";
        const cleaned = stripLegacyImageMarkdown(raw);
        if (cleaned !== raw) repo = updateTextBlock(repo, block.id, cleaned);
      }
      setTitle(item.title);
      setTitleOpen(Boolean(item.title.trim()));
      baselineTitle.current = item.title;
      dirty.current = false;
    }
    setState(repo);
  }, [deckId, itemId]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const deck = state ? getDeck(state, deckId) : undefined;
  const item = state ? getItem(state, itemId) : undefined;
  const blocks: Af03Block[] = state ? listBlocksForFragment(state, itemId) : [];

  function rememberCaret(blockId: string, el: HTMLTextAreaElement | null) {
    if (!el) return;
    caret.current = { textBlockId: blockId, offset: el.selectionStart };
  }

  function insertAtCursor(snippet: string, selectPlaceholder?: string) {
    if (!state) return;
    const focusId = caret.current?.textBlockId ?? blocks.find((b) => b.type === "text")?.id;
    const block = blocks.find((b) => b.id === focusId && b.type === "text");
    if (!block) return;
    const text = (block.payload as Af03TextBlockPayload).text ?? "";
    const el = textRefs.current[block.id];
    const start = el?.selectionStart ?? caret.current?.offset ?? text.length;
    const end = el?.selectionEnd ?? start;
    const next = text.slice(0, start) + snippet + text.slice(end);
    setState(updateTextBlock(state, block.id, next));
    dirty.current = true;
    requestAnimationFrame(() => {
      const node = textRefs.current[block.id];
      if (!node) return;
      node.focus();
      if (selectPlaceholder) {
        const idx = snippet.indexOf(selectPlaceholder);
        if (idx >= 0) {
          const s = start + idx;
          node.setSelectionRange(s, s + selectPlaceholder.length);
          caret.current = { textBlockId: block.id, offset: s };
          return;
        }
      }
      const pos = start + snippet.length;
      node.setSelectionRange(pos, pos);
      caret.current = { textBlockId: block.id, offset: pos };
    });
  }

  async function addImages(files: File[], atBlockId?: string, atEl?: HTMLTextAreaElement) {
    if (!state || files.length === 0) return;
    setImageBusy(true);
    setImageNotice(null);
    let repo = ensureFragmentTextBlock(state, itemId, "");
    let splitCaret: ImageInsertCaret | null = caret.current;
    if (atBlockId && atEl) {
      splitCaret = { textBlockId: atBlockId, offset: atEl.selectionStart };
    }
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const result = await insertImageBlockFromFile(repo, itemId, file, splitCaret);
      if ("error" in result) {
        setImageNotice(result.error);
        setState(repo);
        setImageBusy(false);
        return;
      }
      repo = result.state;
      splitCaret = { afterBlockId: result.block.id };
    }
    setState(repo);
    dirty.current = true;
    setImageBusy(false);
  }

  function deleteImage(blockId: string) {
    if (!state) return;
    const result = removeImageAndMergeParagraphs(state, blockId);
    setState(result.state);
    dirty.current = true;
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
    rememberCaret(blockId, el);
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

  function save() {
    if (!state || !item) return;
    const next = updateContent(state, item.id, { title });
    setState(next);
    baselineTitle.current = title;
    dirty.current = false;
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1500);
  }

  function close() {
    if (dirty.current) {
      if (!window.confirm("Save changes and close?")) return;
      save();
    }
    window.location.href = deckHref(deckId);
  }

  function discardAndClose() {
    if (dirty.current && !window.confirm("Discard unsaved changes?")) return;
    dirty.current = false;
    window.location.href = deckHref(deckId);
  }

  if (!state) {
    return <p className="text-sm text-slate-500">Loading editor…</p>;
  }

  if (!item || item.deckId !== deckId) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-rose-300">
          Content not found in this Chaos Deck.
        </p>
        <Link href={deckHref(deckId)} className="text-sm text-[#2f80ed] underline">
          Back to deck
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3">
      <header className="sticky top-0 z-10 flex shrink-0 flex-nowrap items-center gap-2 bg-[#f4f6f8] py-1">
        <button
          type="button"
          onClick={close}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg text-slate-500 hover:bg-white"
          aria-label="Back"
        >
          ‹
        </button>
        <p className="min-w-0 flex-1 truncate text-[17px] font-semibold text-slate-900">
          {deck?.title ?? "Card"}
        </p>
        <FragmentModeSwitch deckId={deckId} fragmentId={itemId} mode="classic" />
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
      </header>

      {item.unsupported ? (
        <p role="status" className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Stub — {item.unsupportedReason || "payload not fully stored"}.
        </p>
      ) : null}

      {chromeOpen ? (
        <>
          {titleOpen || title.trim() ? (
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Title <span className="font-normal normal-case">(optional)</span>
              </span>
              <input
                id="af03-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  dirty.current = e.target.value !== baselineTitle.current;
                }}
                placeholder="What this cluster is about"
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-[#2f80ed]"
              />
            </label>
          ) : (
            <button
              type="button"
              className="self-start text-sm font-medium text-slate-400 hover:text-slate-600"
              onClick={() => setTitleOpen(true)}
            >
              Add title (optional)
            </button>
          )}

          <div className="flex flex-wrap gap-1.5" role="toolbar" aria-label="Insert structure">
            <ToolbarBtn label="B" title="Bold" onClick={() => insertAtCursor("**text**", "text")} />
            <ToolbarBtn label="I" title="Italic" onClick={() => insertAtCursor("_text_", "text")} />
            <ToolbarBtn label="H1" onClick={() => insertAtCursor("# Heading\n", "Heading")} />
            <ToolbarBtn label="List" onClick={() => insertAtCursor("- item\n", "item")} />
            <ToolbarBtn
              label="Link"
              onClick={() => insertAtCursor("[label](https://example.com)", "https://example.com")}
            />
          </div>

          <MaterialImageAttach
            showPersisted={false}
            busy={imageBusy}
            notice={imageNotice}
            onAddFiles={(files) => void addImages(files)}
          />
        </>
      ) : imageNotice ? (
        <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {imageNotice}
        </p>
      ) : null}

      <div
        className="flex min-h-0 flex-1 flex-col overflow-auto rounded-xl border border-slate-200 bg-white"
        onDragOver={(e: DragEvent<HTMLDivElement>) => e.preventDefault()}
        onDrop={(e: DragEvent<HTMLDivElement>) => {
          const files = filesFromDrop(e);
          if (files.length) void addImages(files);
        }}
      >
        {blocks.map((block) =>
          block.type === "text" ? (
            <textarea
              key={block.id}
              ref={(el) => {
                textRefs.current[block.id] = el;
              }}
              value={(block.payload as Af03TextBlockPayload).text}
              aria-label="Material"
              onChange={(e) => {
                if (!state) return;
                setState(updateTextBlock(state, block.id, e.target.value));
                dirty.current = true;
                rememberCaret(block.id, e.currentTarget);
              }}
              onSelect={(e) => rememberCaret(block.id, e.currentTarget)}
              onClick={(e) => rememberCaret(block.id, e.currentTarget)}
              onKeyUp={(e) => rememberCaret(block.id, e.currentTarget)}
              onKeyDown={(e) => onTextKeyDown(block.id, e)}
              onPaste={(e: ClipboardEvent<HTMLTextAreaElement>) => {
                const files = filesFromPaste(e);
                if (files.length === 0) return;
                e.preventDefault();
                void addImages(files, block.id, e.currentTarget);
              }}
              rows={Math.max(4, ((block.payload as Af03TextBlockPayload).text || "").split("\n").length + 1)}
              className="min-h-[8rem] w-full resize-y border-0 bg-transparent px-4 py-4 text-base leading-relaxed text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2f80ed]"
              placeholder="Write here. Insert an image at the cursor to split this box."
            />
          ) : (
            <figure key={block.id} className="relative border-y border-slate-100 bg-slate-50 px-4 py-3">
              <ChaosAssetImage
                assetId={(block.payload as Af03ImageBlockPayload).assetId}
                alt={(block.payload as Af03ImageBlockPayload).alt || "Image"}
                className="max-h-[28rem] w-full object-contain"
              />
              <button
                type="button"
                className="absolute right-5 top-4 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 shadow-sm"
                aria-label="Delete image"
                onClick={() => deleteImage(block.id)}
              >
                Delete
              </button>
            </figure>
          )
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          className="min-h-11 rounded-xl bg-[#2f80ed] px-5 text-sm font-semibold text-white"
        >
          Save
        </button>
        <button
          type="button"
          onClick={close}
          className="min-h-11 rounded-xl bg-white px-4 text-sm font-medium text-slate-700 shadow-sm"
        >
          Done
        </button>
        <button
          type="button"
          onClick={discardAndClose}
          className="min-h-11 rounded-xl px-4 text-sm font-medium text-slate-400"
        >
          Discard
        </button>
        {savedFlash ? <span className="self-center text-xs font-medium text-emerald-600">Saved</span> : null}
      </div>
    </div>
  );
}

function ToolbarBtn({
  label,
  onClick,
  title,
}: {
  label: string;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      onClick={onClick}
      className="min-h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
    >
      {label}
    </button>
  );
}
