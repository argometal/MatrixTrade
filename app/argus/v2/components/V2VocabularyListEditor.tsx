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

/** Shared chip list for Topic Match tags and Focus Tags — same mechanic, product copy differs. */
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
  /** Vertical stack (default) for sweepable Tag rows; wrap = classic chip cloud. */
  orientation = "stack",
  chipClassName = "inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200",
  removeClassName = "text-amber-400/70 hover:text-amber-100",
  addButtonClassName = "rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40",
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
  orientation?: "stack" | "wrap";
  chipClassName?: string;
  removeClassName?: string;
  addButtonClassName?: string;
}) {
  const listClass =
    orientation === "stack"
      ? "flex flex-col gap-1.5"
      : "flex flex-wrap gap-1.5";
  const rowClass =
    orientation === "stack"
      ? `${chipClassName} w-full justify-between`
      : chipClassName;

  return (
    <div>
      {copy.heading ? <h3 className="text-sm font-semibold text-zinc-100">{copy.heading}</h3> : null}
      {copy.hint ? <p className="mt-1 text-xs leading-relaxed text-zinc-500">{copy.hint}</p> : null}

      <ul className={`${listClass} ${copy.heading || copy.hint ? "mt-3" : ""}`} aria-label="Tags">
        {items.map((item) => (
          <li key={item}>
            <span className={rowClass}>
              <span className="min-w-0 truncate">{item}</span>
              <button
                type="button"
                onClick={() => onRemove(item)}
                className={`shrink-0 ${removeClassName}`}
                aria-label={copy.removeAria(item)}
              >
                ×
              </button>
            </span>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="list-none">
            <p className="text-xs text-zinc-600">{copy.empty}</p>
          </li>
        ) : null}
      </ul>

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
          className={`${addButtonClassName} disabled:opacity-40`}
        >
          {copy.add}
        </button>
        {footer}
      </div>
    </div>
  );
}
