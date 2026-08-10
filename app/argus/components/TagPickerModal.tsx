"use client";

import { useMemo, useState } from "react";
import { CAPTURE, TAGS } from "@/lib/argus/ux-copy";
import { TAG_PICKER_SUGGESTION_LIMIT } from "@/lib/argus/tag-limits";
import { confirmTrackerConvert } from "@/lib/argus/tracker-confirm";
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
  /** When set, Done applies tags through this callback instead of only closing. */
  onConfirm?: (tags: string[]) => void;
  confirmLabel?: string;
  /**
   * `note` = guided reuse picker (Topic → Recent → Universe → Create).
   * `default` / omitted = may show Flag when onToggleSignal is set.
   */
  mode?: "note" | "default";
  /**
   * Derived Tags already used on Notes in the current Topic scope (not persisted).
   * Only used in mode=note.
   */
  topicContextTags?: string[];
  /** Section label override, e.g. topic name. */
  topicContextLabel?: string;
  /** Journal Trackers — Flag affordance when onToggleSignal is set (ignored in mode=note). */
  signalTags?: string[];
  onToggleSignal?: (tag: string) => void;
}

function normalizeTag(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function tagKey(tag: string): string {
  return tag.toLowerCase();
}

function uniqueTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    const key = tagKey(tag);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

function TagRow({
  tag,
  checked,
  onToggle,
  isSignal,
  onToggleSignal,
}: {
  tag: string;
  checked: boolean;
  onToggle: () => void;
  isSignal?: boolean;
  onToggleSignal?: () => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-zinc-800/60">
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
        <input type="checkbox" checked={checked} onChange={onToggle} className="shrink-0" />
        <span className={`truncate text-sm ${isSignal ? "font-semibold text-rose-300" : "text-zinc-200"}`}>
          {isSignal ? "⚑ " : ""}#{tag}
        </span>
      </label>
      {onToggleSignal ? (
        <button
          type="button"
          onClick={() => {
            if (!confirmTrackerConvert(tag, Boolean(isSignal))) return;
            onToggleSignal();
          }}
          className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
            isSignal
              ? "bg-rose-950/50 text-rose-300 ring-1 ring-rose-500/40"
              : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          }`}
          title={isSignal ? "Disable Tracker (confirm)" : "Flag as Tracker (confirm)"}
          aria-label={isSignal ? `Disable Tracker on ${tag}` : `Flag ${tag} as Tracker`}
          aria-pressed={isSignal}
        >
          {isSignal ? "Tracker" : "Flag"}
        </button>
      ) : null}
    </div>
  );
}

function Section({
  title,
  tags,
  selectedKeys,
  onToggle,
  showFlag,
  signalKeys,
  onToggleSignal,
}: {
  title: string;
  tags: string[];
  selectedKeys: Set<string>;
  onToggle: (tag: string) => void;
  showFlag: boolean;
  signalKeys: Set<string>;
  onToggleSignal?: (tag: string) => void;
}) {
  if (tags.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-600">{title}</p>
      <div className="space-y-0.5">
        {tags.map((tag) => (
          <TagRow
            key={tagKey(tag)}
            tag={tag}
            checked={selectedKeys.has(tagKey(tag))}
            onToggle={() => onToggle(tag)}
            isSignal={showFlag && signalKeys.has(tagKey(tag))}
            onToggleSignal={showFlag && onToggleSignal ? () => onToggleSignal(tag) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

export function TagPickerModal({
  open,
  buckets,
  selectedTags,
  onChange,
  onClose,
  onConfirm,
  confirmLabel,
  mode = "default",
  topicContextTags = [],
  topicContextLabel,
  signalTags,
  onToggleSignal,
}: TagPickerModalProps) {
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  const noteOnly = mode === "note";
  const showFlag = !noteOnly && Boolean(onToggleSignal);

  const selectedKeys = useMemo(() => new Set(selectedTags.map(tagKey)), [selectedTags]);
  const signalKeys = useMemo(
    () => new Set((showFlag ? signalTags : undefined)?.map(tagKey).filter(Boolean) ?? []),
    [signalTags, showFlag]
  );

  const universeTags = useMemo(() => uniqueTags(buckets.all), [buckets.all]);

  const allTags = useMemo(() => {
    const extras = showFlag ? (signalTags ?? []) : [];
    return uniqueTags([...selectedTags, ...topicContextTags, ...extras, ...universeTags]).sort((a, b) => {
      const aFocus = signalKeys.has(tagKey(a)) ? 1 : 0;
      const bFocus = signalKeys.has(tagKey(b)) ? 1 : 0;
      if (aFocus !== bFocus) return bFocus - aFocus;
      return a.localeCompare(b);
    });
  }, [selectedTags, topicContextTags, signalTags, universeTags, signalKeys, showFlag]);

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  const topicPool = useMemo(() => uniqueTags(topicContextTags), [topicContextTags]);

  const recentPool = useMemo(() => {
    const recent =
      buckets.recent.length > 0
        ? buckets.recent
        : buckets.frequent.length > 0
          ? buckets.frequent
          : [];
    const topicKeys = new Set(topicPool.map(tagKey));
    return uniqueTags(recent).filter((tag) => !topicKeys.has(tagKey(tag))).slice(0, TAG_PICKER_SUGGESTION_LIMIT);
  }, [buckets.recent, buckets.frequent, topicPool]);

  const searchResults = useMemo(() => {
    if (!searching) return [];
    const topicKeys = new Set(topicPool.map(tagKey));
    const matches = allTags.filter((t) => t.toLowerCase().includes(q));
    return matches.sort((a, b) => {
      const aTopic = topicKeys.has(tagKey(a)) ? 1 : 0;
      const bTopic = topicKeys.has(tagKey(b)) ? 1 : 0;
      if (aTopic !== bTopic) return bTopic - aTopic;
      return a.localeCompare(b);
    });
  }, [searching, allTags, q, topicPool]);

  const exactMatch = useMemo(() => {
    if (!searching) return false;
    return allTags.some((tag) => tagKey(tag) === q);
  }, [searching, allTags, q]);

  const topicSectionTitle =
    topicContextLabel?.trim() ||
    (topicPool.length > 0 ? TAGS.sectionTopicLinked : TAGS.sectionTopic);

  function toggle(tag: string) {
    const key = tagKey(tag);
    if (selectedKeys.has(key)) {
      onChange(selectedTags.filter((t) => tagKey(t) !== key));
    } else {
      onChange([...selectedTags, tag]);
    }
  }

  function addNewTag(raw?: string) {
    const tag = normalizeTag(raw ?? newTagName);
    if (!tag) return;
    const key = tagKey(tag);
    if (!selectedKeys.has(key)) {
      onChange([...selectedTags, tag]);
    }
    setNewTagName("");
    setCreateOpen(false);
    setQuery("");
  }

  if (!open) return null;

  const createDraft = searching && !exactMatch ? normalizeTag(query) : normalizeTag(newTagName);
  const canCreateFromSearch = Boolean(searching && !exactMatch && createDraft);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[min(560px,88vh)] w-full max-w-md flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-800 px-4 py-3">
          <h3 className="text-[15px] font-semibold text-zinc-100">
            {noteOnly ? TAGS.titleOnNote : TAGS.title}
          </h3>
          {noteOnly || showFlag ? (
            <p className="mt-1 text-[11px] leading-snug text-zinc-500">
              {noteOnly ? TAGS.pickerHintOnNote : TAGS.pickerHintWithFlag}
            </p>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col p-4">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCreateOpen(false);
            }}
            placeholder={TAGS.searchPlaceholder}
            className={inputClass}
            autoFocus
          />

          <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
            {noteOnly ? (
              searching ? (
                searchResults.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-zinc-500">{TAGS.noResults}</p>
                  </div>
                ) : (
                  <Section
                    title={TAGS.sectionMatches}
                    tags={searchResults}
                    selectedKeys={selectedKeys}
                    onToggle={toggle}
                    showFlag={false}
                    signalKeys={signalKeys}
                  />
                )
              ) : (
                <>
                  <Section
                    title={topicSectionTitle}
                    tags={topicPool.slice(0, TAG_PICKER_SUGGESTION_LIMIT * 2)}
                    selectedKeys={selectedKeys}
                    onToggle={toggle}
                    showFlag={false}
                    signalKeys={signalKeys}
                  />
                  <Section
                    title={TAGS.sectionRecent}
                    tags={recentPool}
                    selectedKeys={selectedKeys}
                    onToggle={toggle}
                    showFlag={false}
                    signalKeys={signalKeys}
                  />
                  <p className="mt-4 text-[11px] leading-snug text-zinc-600">{TAGS.searchUniverseHint}</p>
                  {topicPool.length === 0 && recentPool.length === 0 && universeTags.length === 0 ? (
                    <div className="py-6 text-center">
                      <p className="text-sm text-zinc-500">{TAGS.empty}</p>
                      <p className="mt-1 text-xs text-zinc-600">{TAGS.emptyHint}</p>
                    </div>
                  ) : null}
                </>
              )
            ) : searching ? (
              searchResults.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-zinc-500">{TAGS.noResults}</p>
                </div>
              ) : (
                <Section
                  title={TAGS.sectionMatches}
                  tags={searchResults}
                  selectedKeys={selectedKeys}
                  onToggle={toggle}
                  showFlag={showFlag}
                  signalKeys={signalKeys}
                  onToggleSignal={onToggleSignal}
                />
              )
            ) : (
              <>
                <Section
                  title={TAGS.sectionRecent}
                  tags={
                    buckets.recent.length > 0
                      ? buckets.recent.slice(0, TAG_PICKER_SUGGESTION_LIMIT)
                      : buckets.frequent.slice(0, TAG_PICKER_SUGGESTION_LIMIT)
                  }
                  selectedKeys={selectedKeys}
                  onToggle={toggle}
                  showFlag={showFlag}
                  signalKeys={signalKeys}
                  onToggleSignal={onToggleSignal}
                />
                <Section
                  title={TAGS.sectionUniverse}
                  tags={universeTags.slice(0, TAG_PICKER_SUGGESTION_LIMIT)}
                  selectedKeys={selectedKeys}
                  onToggle={toggle}
                  showFlag={showFlag}
                  signalKeys={signalKeys}
                  onToggleSignal={onToggleSignal}
                />
                {universeTags.length === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-sm text-zinc-500">{TAGS.empty}</p>
                    <p className="mt-1 text-xs text-zinc-600">{TAGS.emptyHint}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-[11px] leading-snug text-zinc-600">{TAGS.searchUniverseHint}</p>
                )}
              </>
            )}
          </div>

          {selectedTags.length > 0 && (
            <p className="mt-2 text-xs text-teal-400/90">
              {TAGS.selected(selectedTags.length, selectedTags.map((t) => `#${t}`).join(", "))}
            </p>
          )}

          {/* Create New — last; encouraged only after search finds no match */}
          <div className="mt-3 border-t border-zinc-800/80 pt-3">
            {canCreateFromSearch ? (
              <button
                type="button"
                onClick={() => addNewTag(query)}
                className="w-full rounded-xl border border-dashed border-zinc-700 py-2 text-sm font-medium text-zinc-300 hover:border-teal-700/60 hover:bg-teal-950/30 hover:text-teal-200"
              >
                + {TAGS.createNamed(createDraft)}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setCreateOpen((v) => !v);
                    if (!createOpen) setNewTagName(searching ? query : "");
                  }}
                  className="w-full rounded-xl border border-zinc-800 py-2 text-sm font-medium text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                >
                  + {TAGS.createAfterSearch}
                </button>
                {createOpen ? (
                  <div className="mt-2 space-y-2 rounded-xl border border-zinc-800 p-3">
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
                        onClick={() => addNewTag()}
                        disabled={!normalizeTag(newTagName)}
                        className="flex-1 rounded-lg bg-teal-700 py-2 text-sm font-medium text-white disabled:opacity-40"
                      >
                        {CAPTURE.save}
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
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
            onClick={() => {
              if (onConfirm) onConfirm(selectedTags);
              else onClose();
            }}
            disabled={onConfirm ? selectedTags.length === 0 : false}
            className="flex-1 rounded-lg bg-teal-700 py-2.5 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-40"
          >
            {confirmLabel ?? CAPTURE.done}
          </button>
        </div>
      </div>
    </div>
  );
}
