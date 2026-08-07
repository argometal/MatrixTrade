"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { updateSignalTagsAction } from "@/app/argus/actions";
import { SIGNAL_TAGS } from "@/lib/argus/ux-copy";
import { V2VocabularyListEditor } from "@/app/argus/v2/components/V2VocabularyListEditor";

function normalizeTag(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function V2SignalTagsEditor({
  initialTags,
  returnTo = "/argus/v2",
  compact = false,
}: {
  initialTags: string[];
  returnTo?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [tags, setTags] = useState<string[]>(initialTags);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTags(initialTags);
    setDraft("");
  }, [initialTags]);

  function addTag() {
    const next = normalizeTag(draft);
    if (!next || tags.some((t) => t.toLowerCase() === next.toLowerCase())) {
      setDraft("");
      return;
    }
    setTags((current) => [...current, next]);
    setDraft("");
  }

  function removeTag(item: string) {
    setTags((current) => current.filter((value) => value !== item));
  }

  async function saveTags() {
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("signalTags", tags.join(", "));
      formData.set("returnTo", returnTo);
      await updateSignalTagsAction(formData);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const dirty =
    tags.length !== initialTags.length || tags.some((tag, index) => tag !== initialTags[index]);

  return (
    <div className={compact ? "" : "rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-4"}>
      <V2VocabularyListEditor
        items={tags}
        draft={draft}
        onDraftChange={setDraft}
        onAdd={addTag}
        onRemove={removeTag}
        copy={{
          heading: SIGNAL_TAGS.heading,
          hint: SIGNAL_TAGS.hint,
          placeholder: SIGNAL_TAGS.placeholder,
          add: SIGNAL_TAGS.add,
          empty: SIGNAL_TAGS.empty,
          removeAria: SIGNAL_TAGS.removeAria,
        }}
        inputAriaLabel="Flag a focus Tag"
        footer={
          <button
            type="button"
            onClick={() => void saveTags()}
            disabled={!dirty || busy}
            className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-40"
          >
            {busy ? "Saving…" : SIGNAL_TAGS.save}
          </button>
        }
      />
    </div>
  );
}
