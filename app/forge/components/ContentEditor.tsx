"use client";

import Link from "next/link";
import { Lexend } from "next/font/google";
import { useEffect, useRef, useState } from "react";
import {
  deckHref,
  emptyOrSeedRepo,
  getDeck,
  getItem,
  updateContent,
  viewHref,
} from "@/lib/argusforge/af03-repo-store";
import type { Af03RepoState } from "@/lib/argusforge/af03-repo-types";
import { Af03RepoDisclosure } from "./Af03RepoDisclosure";

const editorFont = Lexend({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

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
 * AF03 §8 — Basic content editor (not Alexandria).
 * Ingest-first: plain fragment body, no decorative structure toolbar.
 */
export function ContentEditor({ deckId, itemId }: Props) {
  const [state, setState] = useState<Af03RepoState | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const dirty = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const baseline = useRef({ title: "", body: "" });

  useEffect(() => {
    const repo = emptyOrSeedRepo();
    setState(repo);
    const item = getItem(repo, itemId);
    if (item && item.deckId === deckId) {
      setTitle(item.title);
      setBody(item.body);
      baseline.current = { title: item.title, body: item.body };
      dirty.current = false;
    }
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

  function markDirty(nextTitle: string, nextBody: string) {
    dirty.current =
      nextTitle !== baseline.current.title || nextBody !== baseline.current.body;
  }

  function save() {
    if (!state || !item) return;
    const next = updateContent(state, item.id, { title, body });
    setState(next);
    baseline.current = { title, body };
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
    return <p className="text-sm text-zinc-500">Loading editor…</p>;
  }

  if (!item || item.deckId !== deckId) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-rose-300">
          Content not found in this Chaos Deck.
        </p>
        <Link href={deckHref(deckId)} className="text-sm text-zinc-300 underline">
          Back to deck
        </Link>
      </div>
    );
  }

  return (
    <div className={`${editorFont.className} space-y-4`}>
      <Af03RepoDisclosure />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={deckHref(deckId)}
          className="text-xs text-zinc-500 hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          onClick={(e) => {
            if (!dirty.current) return;
            e.preventDefault();
            close();
          }}
        >
          ← {deck?.title ?? "Chaos Deck"}
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={viewHref(deckId, itemId)}
            className="text-xs font-medium text-sky-400 hover:text-sky-300"
            onClick={(e) => {
              if (dirty.current && !window.confirm("Discard unsaved changes and open Viewer?")) {
                e.preventDefault();
              } else {
                dirty.current = false;
              }
            }}
          >
            Viewer
          </Link>
          <p className="text-[10px] uppercase tracking-wide text-zinc-600">
            Edit · ingest · not Alexandria
          </p>
        </div>
      </div>

      {item.unsupported ? (
        <p role="status" className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-100/90">
          Stub item — {item.unsupportedReason || "payload not fully stored in this prototype"}.
          Original reference preserved; not silently discarded.
        </p>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="af03-title" className="text-sm font-medium text-zinc-300">
          Title (optional)
        </label>
        <input
          id="af03-title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            markDirty(e.target.value, body);
          }}
          className="min-h-11 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-lg font-medium text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="af03-body" className="text-sm font-medium text-zinc-300">
          Body
        </label>
        <textarea
          id="af03-body"
          ref={textareaRef}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            markDirty(title, e.target.value);
          }}
          rows={18}
          className="min-h-[50vh] w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-4 text-[18px] leading-[1.55] text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          placeholder="Write freely — two lines or a chapter. No classification."
        />
      </div>

      <dl className="grid grid-cols-2 gap-2 text-xs text-zinc-500">
        <div>
          <dt>Created</dt>
          <dd className="text-zinc-300">{formatTime(item.createdAt)}</dd>
        </div>
        <div>
          <dt>Modified</dt>
          <dd className="text-zinc-300">{formatTime(item.updatedAt)}</dd>
        </div>
        {item.sourceRef ? (
          <div className="col-span-2">
            <dt>Source ref</dt>
            <dd className="truncate text-zinc-300">{item.sourceRef}</dd>
          </div>
        ) : null}
      </dl>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          className="min-h-11 rounded-lg border border-zinc-600 bg-zinc-100 px-4 text-sm font-semibold text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          Save
        </button>
        <button
          type="button"
          onClick={close}
          className="min-h-11 rounded-lg border border-zinc-700 px-4 text-sm font-medium text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          Save & close
        </button>
        <button
          type="button"
          onClick={discardAndClose}
          className="min-h-11 rounded-lg border border-zinc-800 px-4 text-sm font-medium text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          Discard
        </button>
        {savedFlash ? <span className="self-center text-xs text-emerald-400">Saved</span> : null}
      </div>
    </div>
  );
}
