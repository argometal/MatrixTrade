"use client";

import type { ReactNode } from "react";

export type V2VocabularyListCopy = {
  heading?: string;
  hint?: string;
  placeholder: string;
  add: string;
  empty: string;
  removeAria: (item: string) => string;
};

/** Shared chip list for Topic Aliases and Event Signals — same mechanic, product copy differs. */
export function V2VocabularyListEditor({
  items,
  draft,
  onDraftChange,
  onAdd,
  onRemove,
  copy,
  footer,
  inputAriaLabel,
  onEnterAdd = true,
}: {
  items: string[];
  draft: string;
  onDraftChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (item: string) => void;
  copy: V2VocabularyListCopy;
  footer?: ReactNode;
  inputAriaLabel?: string;
  onEnterAdd?: boolean;
}) {
  return (
    <div>
      {copy.heading ? <h3 className="text-sm font-semibold text-zinc-100">{copy.heading}</h3> : null}
      {copy.hint ? <p className="mt-1 text-xs leading-relaxed text-zinc-500">{copy.hint}</p> : null}

      <div className={`flex flex-wrap gap-1.5 ${copy.heading || copy.hint ? "mt-3" : ""}`}>
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200"
          >
            {item}
            <button
              type="button"
              onClick={() => onRemove(item)}
              className="text-amber-400/70 hover:text-amber-100"
              aria-label={copy.removeAria(item)}
            >
              ×
            </button>
          </span>
        ))}
        {items.length === 0 ? <p className="text-xs text-zinc-600">{copy.empty}</p> : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (onEnterAdd && event.key === "Enter") {
              event.preventDefault();
              onAdd();
            }
          }}
          placeholder={copy.placeholder}
          className="min-w-[10rem] flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
          aria-label={inputAriaLabel ?? copy.placeholder}
        />
        <button
          type="button"
          onClick={onAdd}
          disabled={!draft.trim()}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
        >
          {copy.add}
        </button>
        {footer}
      </div>
    </div>
  );
}
