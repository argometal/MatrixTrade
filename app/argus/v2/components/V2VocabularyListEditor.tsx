"use client";

import type { ReactNode } from "react";
import { TAG_MANAGE_LIST_CLASS, TAG_MANAGE_ROW_CLASS } from "./tag-manage-list";

export type V2VocabularyListCopy = {
  heading?: string;
  hint?: string;
  placeholder: string;
  add: string;
  empty: string;
  removeAria: (item: string) => string;
};

/** Shared Tag list — Manage List · rows (vertical full-width). */
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
  /** Always Manage stack; wrap kept for type compat only. */
  orientation: _orientation = "stack",
  chipClassName = TAG_MANAGE_ROW_CLASS,
  removeClassName = "text-zinc-500 hover:text-zinc-100",
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
  const rowClass = chipClassName.includes("rounded-xl") ? chipClassName : TAG_MANAGE_ROW_CLASS;

  return (
    <div>
      {copy.heading ? <h3 className="text-sm font-semibold text-zinc-100">{copy.heading}</h3> : null}
      {copy.hint ? <p className="mt-1 text-xs leading-relaxed text-zinc-500">{copy.hint}</p> : null}

      <ul
        className={`${TAG_MANAGE_LIST_CLASS} ${copy.heading || copy.hint ? "mt-3" : ""}`}
        aria-label="Tags"
      >
        {items.map((item) => (
          <li key={item}>
            <span className={`${rowClass} justify-between`}>
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-bold text-violet-200"
                  aria-hidden
                >
                  #
                </span>
                <span className="min-w-0 truncate font-semibold text-zinc-100">{item}</span>
              </span>
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
