"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { updateTopicAliasesAction } from "@/app/argus/actions";
import { TOPIC_MATCH_TAGS } from "@/lib/argus/ux-copy";
import { V2VocabularyListEditor } from "@/app/argus/v2/components/V2VocabularyListEditor";

function normalizeMatchTag(value: string): string {
  return value.trim().toLowerCase();
}

export function V2TopicAliasEditor({
  topicId,
  topicName,
  initialAliases,
  returnTo,
  compact = false,
}: {
  topicId: string;
  topicName: string;
  initialAliases: string[];
  returnTo: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [matchTags, setMatchTags] = useState<string[]>(initialAliases);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMatchTags(initialAliases);
    setDraft("");
  }, [topicId, initialAliases]);

  function addMatchTag() {
    const next = normalizeMatchTag(draft);
    if (!next || matchTags.some((tag) => tag.toLowerCase() === next)) {
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
        chipClassName="inline-flex items-center gap-1 rounded-md border border-violet-500/35 bg-violet-500/10 px-2 py-1 text-[11px] text-violet-100"
        removeClassName="text-violet-300/70 hover:text-violet-50"
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
    </div>
  );
}
