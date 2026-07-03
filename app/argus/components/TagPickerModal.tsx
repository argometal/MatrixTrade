"use client";

import { useMemo, useState } from "react";
import { CAPTURE, TAGS } from "@/lib/argus/ux-copy";
import { inputClass } from "./ui";

export interface TagBuckets {
  recent: string[];
  frequent: string[];
  all: string[];
}

interface TagPickerModalProps {
  open: boolean;
  buckets: TagBuckets;
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  onClose: () => void;
}

function normalizeTag(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function tagKey(tag: string): string {
  return tag.toLowerCase();
}

function TagRow({ tag, checked, onToggle }: { tag: string; checked: boolean; onToggle: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-zinc-800/60">
      <input type="checkbox" checked={checked} onChange={onToggle} className="shrink-0" />
      <span className="text-sm text-zinc-200">#{tag}</span>
    </label>
  );
}

export function TagPickerModal({ open, buckets, selectedTags, onChange, onClose }: TagPickerModalProps) {
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  const selectedKeys = useMemo(() => new Set(selectedTags.map(tagKey)), [selectedTags]);

  const allTags = useMemo(() => {
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const tag of [...selectedTags, ...buckets.all]) {
      const key = tagKey(tag);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(tag);
    }
    return merged.sort((a, b) => a.localeCompare(b));
  }, [buckets.all, selectedTags]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allTags.filter((t) => t.toLowerCase().includes(q));
  }, [allTags, query]);

  const recentList =
    buckets.recent.length > 0 ? buckets.recent : buckets.frequent.length > 0 ? buckets.frequent : [];

  const visible = query.trim() ? searchResults : recentList.length > 0 ? recentList : allTags.slice(0, 20);

  function toggle(tag: string) {
    const key = tagKey(tag);
    if (selectedKeys.has(key)) {
      onChange(selectedTags.filter((t) => tagKey(t) !== key));
    } else {
      onChange([...selectedTags, tag]);
    }
  }

  function addNewTag() {
    const tag = normalizeTag(newTagName);
    if (!tag) return;
    const key = tagKey(tag);
    if (!selectedKeys.has(key)) {
      onChange([...selectedTags, tag]);
    }
    setNewTagName("");
    setCreateOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[min(520px,85vh)] w-full max-w-md flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-800 px-4 py-3">
          <h3 className="text-[15px] font-semibold text-zinc-100">{TAGS.title}</h3>
        </div>

        <div className="flex min-h-0 flex-1 flex-col p-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={TAGS.searchPlaceholder}
            className={inputClass}
            autoFocus
          />

          <button
            type="button"
            onClick={() => setCreateOpen((v) => !v)}
            className="mt-3 w-full rounded-xl border border-teal-800/60 bg-teal-950/40 py-2 text-sm font-medium text-teal-300 hover:bg-teal-900/40"
          >
            + {TAGS.createNew}
          </button>

          {createOpen && (
            <div className="mt-3 space-y-2 rounded-xl border border-zinc-800 p-3">
              <input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder={TAGS.namePlaceholder}
                className={inputClass}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addNewTag();
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreateOpen(false);
                    setNewTagName("");
                  }}
                  className="flex-1 rounded-lg border border-zinc-700 py-2 text-sm text-zinc-300"
                >
                  {CAPTURE.cancel}
                </button>
                <button
                  type="button"
                  onClick={addNewTag}
                  disabled={!normalizeTag(newTagName)}
                  className="flex-1 rounded-lg bg-teal-700 py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                  {CAPTURE.save}
                </button>
              </div>
            </div>
          )}

          {!query.trim() && visible.length > 0 && (
            <p className="mt-3 text-[11px] font-medium uppercase tracking-wider text-zinc-600">
              {recentList.length > 0 ? TAGS.recent : TAGS.all}
            </p>
          )}

          <div className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
            {visible.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-zinc-500">{query.trim() ? TAGS.noResults : TAGS.empty}</p>
                {!query.trim() && (
                  <p className="mt-1 text-xs text-zinc-600">{TAGS.emptyHint}</p>
                )}
              </div>
            ) : (
              visible.map((tag) => (
                <TagRow
                  key={tagKey(tag)}
                  tag={tag}
                  checked={selectedKeys.has(tagKey(tag))}
                  onToggle={() => toggle(tag)}
                />
              ))
            )}
          </div>

          {selectedTags.length > 0 && (
            <p className="mt-2 text-xs text-teal-400/90">
              {TAGS.selected(selectedTags.length, selectedTags.map((t) => `#${t}`).join(", "))}
            </p>
          )}
        </div>

        <div className="flex gap-2 border-t border-zinc-800 p-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-700 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            {CAPTURE.cancel}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg bg-teal-700 py-2.5 text-sm font-medium text-white hover:bg-teal-600"
          >
            {CAPTURE.done}
          </button>
        </div>
      </div>
    </div>
  );
}
