"use client";

import { useRouter } from "next/navigation";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { updateEventTagsAction } from "@/app/argus/actions";
import { EVENT_MATCH_TAGS } from "@/lib/argus/ux-copy";
import { V2VocabularyListEditor } from "@/app/argus/v2/components/V2VocabularyListEditor";
import { TAG_MANAGE_LIST_CLASS, TAG_MANAGE_ROW_CLASS } from "@/app/argus/v2/components/tag-manage-list";

function normalizeDisplayTag(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function tagKey(value: string): string {
  return normalizeDisplayTag(value).toLowerCase();
}

export type V2EventTagEditorHandle = {
  /** Attach a Tag from branch drag/drop (or other recall). No-op if already linked. */
  attachTag: (tag: string) => void;
};

export const V2EventTagEditor = forwardRef<
  V2EventTagEditorHandle,
  {
    eventId: string;
    eventName: string;
    initialTags: string[];
    returnTo: string;
    /** When embedded in V2BinderTagsTab — parent owns heading/hint. */
    compact?: boolean;
    suggestedFromNotes?: string[];
    /** Journal Trackers — passive ⚑ on binder rows (no click-to-Flag). */
    signalTags?: string[];
  }
>(function V2EventTagEditor(
  {
    eventId,
    eventName,
    initialTags,
    returnTo,
    compact = false,
    suggestedFromNotes = [],
    signalTags = [],
  },
  ref
) {
  const router = useRouter();
  const [matchTags, setMatchTags] = useState<string[]>(initialTags);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMatchTags(initialTags);
    setDraft("");
  }, [eventId, initialTags]);

  const attachedKeys = useMemo(
    () => new Set(matchTags.map(tagKey).filter(Boolean)),
    [matchTags]
  );

  const trackedKeys = useMemo(
    () => new Set(signalTags.map(tagKey).filter(Boolean)),
    [signalTags]
  );

  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of suggestedFromNotes) {
      const tag = normalizeDisplayTag(raw);
      const key = tagKey(tag);
      if (!tag || !key || attachedKeys.has(key) || seen.has(key)) continue;
      seen.add(key);
      out.push(tag);
    }
    return out.sort((a, b) => a.localeCompare(b));
  }, [suggestedFromNotes, attachedKeys]);

  function attachSuggestion(tag: string) {
    const next = normalizeDisplayTag(tag);
    if (!next) return;
    setMatchTags((current) => {
      if (current.some((t) => tagKey(t) === tagKey(next))) return current;
      return [...current, next];
    });
  }

  useImperativeHandle(
    ref,
    () => ({
      attachTag: (tag: string) => attachSuggestion(tag),
    }),
    []
  );

  function addMatchTag() {
    const next = normalizeDisplayTag(draft);
    if (!next || matchTags.some((tag) => tagKey(tag) === tagKey(next))) {
      setDraft("");
      return;
    }
    setMatchTags((current) => [...current, next]);
    setDraft("");
  }

  function removeMatchTag(tag: string) {
    setMatchTags((current) => current.filter((value) => value !== tag));
  }

  async function saveMatchTags() {
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("entityId", eventId);
      formData.set("eventTags", matchTags.join(", "));
      formData.set("returnTo", returnTo);
      await updateEventTagsAction(formData);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const dirty =
    matchTags.length !== initialTags.length ||
    matchTags.some((tag, index) => tag !== initialTags[index]);

  const copy = {
    heading: compact ? undefined : EVENT_MATCH_TAGS.heading,
    hint: compact ? undefined : EVENT_MATCH_TAGS.hint,
    placeholder: EVENT_MATCH_TAGS.placeholder,
    add: "+ Add Tag",
    empty: EVENT_MATCH_TAGS.empty,
    removeAria: EVENT_MATCH_TAGS.removeAria,
  };

  return (
    <div className={compact ? undefined : "rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-4"}>
      <V2VocabularyListEditor
        items={matchTags}
        draft={draft}
        onDraftChange={setDraft}
        onAdd={addMatchTag}
        onRemove={removeMatchTag}
        copy={copy}
        orientation="stack"
        trackedKeys={trackedKeys}
        removeClassName="text-violet-300/70 hover:text-violet-50"
        addButtonClassName="rounded-lg border border-violet-500/50 bg-transparent px-3 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-950/40"
        inputAriaLabel={`Add Event Tag for ${eventName}`}
        footer={
          <button
            type="button"
            onClick={() => void saveMatchTags()}
            disabled={!dirty || busy}
            className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
          >
            {busy ? "Saving…" : EVENT_MATCH_TAGS.save}
          </button>
        }
      />

      {suggestions.length > 0 ? (
        <div className="mt-3 rounded-xl border border-sky-500/25 bg-sky-950/20 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-200/90">
            On Notes — attach to this Event
          </p>
          <ul className={`mt-2 ${TAG_MANAGE_LIST_CLASS}`} aria-label="Evidence Tags to attach">
            {suggestions.map((tag) => {
              const tracked = trackedKeys.has(tagKey(tag));
              return (
                <li key={tag}>
                  <button
                    type="button"
                    onClick={() => attachSuggestion(tag)}
                    className={`${tracked ? "flex w-full items-center gap-4 rounded-xl border border-amber-400/40 bg-rose-950/30 px-4 py-3 text-left text-sm hover:border-sky-500/40" : TAG_MANAGE_ROW_CLASS} hover:border-sky-500/40`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        tracked ? "bg-amber-500/20 text-amber-100" : "bg-sky-600/20 text-sky-100"
                      }`}
                      aria-hidden
                    >
                      {tracked ? "⚑" : "#"}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-zinc-100">{tag}</span>
                    {tracked ? (
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-amber-200/90">
                        Tracked
                      </span>
                    ) : null}
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-sky-300/90">
                      Attach
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
});
