"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { updateTopicAliasesAction } from "@/app/argus/actions";
import { TOPIC_MATCH_TAGS } from "@/lib/argus/ux-copy";
import { V2VocabularyListEditor } from "@/app/argus/v2/components/V2VocabularyListEditor";
import { TAG_MANAGE_LIST_CLASS, TAG_MANAGE_ROW_CLASS } from "@/app/argus/v2/components/tag-manage-list";

function normalizeDisplayTag(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function tagKey(value: string): string {
  return normalizeDisplayTag(value).toLowerCase();
}

export function V2TopicAliasEditor({
  topicId,
  topicName,
  initialAliases,
  returnTo,
  compact = false,
  suggestedFromNotes = [],
  signalTags = [],
}: {
  topicId: string;
  topicName: string;
  initialAliases: string[];
  returnTo: string;
  compact?: boolean;
  /** Evidence Tags on Notes not yet attached as Topic Tags — recall / attach. */
  suggestedFromNotes?: string[];
  /** Journal Trackers — passive ⚑ on binder rows (no click-to-Flag). */
  signalTags?: string[];
}) {
  const router = useRouter();
  const [matchTags, setMatchTags] = useState<string[]>(initialAliases);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMatchTags(initialAliases);
    setDraft("");
  }, [topicId, initialAliases]);

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

  function addMatchTag() {
    const next = normalizeDisplayTag(draft);
    if (!next || matchTags.some((tag) => tagKey(tag) === tagKey(next))) {
      setDraft("");
      return;
    }
    setMatchTags((current) => [...current, next]);
    setDraft("");
  }

  function attachSuggestion(tag: string) {
    const next = normalizeDisplayTag(tag);
    if (!next || matchTags.some((t) => tagKey(t) === tagKey(next))) return;
    setMatchTags((current) => [...current, next]);
  }

  function removeMatchTag(tag: string) {
    setMatchTags((current) => current.filter((value) => value !== tag));
  }

  async function saveMatchTags() {
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("entityId", topicId);
      formData.set("linkedTags", matchTags.join(", "));
      formData.set("returnTo", returnTo);
      await updateTopicAliasesAction(formData);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const dirty =
    matchTags.length !== initialAliases.length ||
    matchTags.some((tag, index) => tag !== initialAliases[index]);

  const copy = {
    heading: compact ? undefined : TOPIC_MATCH_TAGS.heading,
    hint: compact ? undefined : TOPIC_MATCH_TAGS.hint,
    placeholder: TOPIC_MATCH_TAGS.placeholder,
    add: "+ Add Tag",
    empty: TOPIC_MATCH_TAGS.empty,
    removeAria: TOPIC_MATCH_TAGS.removeAria,
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
        inputAriaLabel={`Add Topic Tag for ${topicName}`}
        footer={
          <button
            type="button"
            onClick={() => void saveMatchTags()}
            disabled={!dirty || busy}
            className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
          >
            {busy ? "Saving…" : TOPIC_MATCH_TAGS.save}
          </button>
        }
      />

      {suggestions.length > 0 ? (
        <div className="mt-3 rounded-xl border border-sky-500/25 bg-sky-950/20 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-200/90">
            On Notes — attach to this Topic
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
}
