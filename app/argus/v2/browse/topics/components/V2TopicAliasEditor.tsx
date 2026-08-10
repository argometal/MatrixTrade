"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { updateTopicAliasesAction } from "@/app/argus/actions";
import { TOPIC_MATCH_TAGS } from "@/lib/argus/ux-copy";
import { V2VocabularyListEditor } from "@/app/argus/v2/components/V2VocabularyListEditor";

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
}: {
  topicId: string;
  topicName: string;
  initialAliases: string[];
  returnTo: string;
  compact?: boolean;
  /** Evidence Tags on Notes not yet attached as Topic Tags — recall / attach. */
  suggestedFromNotes?: string[];
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
        chipClassName="flex w-full items-center justify-between gap-2 rounded-lg border border-violet-500/35 bg-violet-500/10 px-2.5 py-1.5 text-[12px] text-violet-100"
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
          <ul className="mt-2 flex flex-col gap-1.5" aria-label="Evidence Tags to attach">
            {suggestions.map((tag) => (
              <li key={tag}>
                <button
                  type="button"
                  onClick={() => attachSuggestion(tag)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-sky-500/30 bg-zinc-950/50 px-2.5 py-1.5 text-left text-[12px] text-sky-100 hover:border-sky-400/50 hover:bg-sky-950/40"
                >
                  <span className="min-w-0 truncate">#{tag}</span>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-sky-300/90">
                    Attach
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
