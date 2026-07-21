"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { updateTopicAliasesAction } from "@/app/argus/actions";
import { TOPIC_ALIASES } from "@/lib/argus/ux-copy";
import { V2VocabularyListEditor } from "@/app/argus/v2/components/V2VocabularyListEditor";

function normalizeAlias(value: string): string {
  return value.trim().toLowerCase();
}

export function V2TopicAliasEditor({
  topicId,
  topicName,
  initialAliases,
  returnTo,
}: {
  topicId: string;
  topicName: string;
  initialAliases: string[];
  returnTo: string;
}) {
  const router = useRouter();
  const [aliases, setAliases] = useState<string[]>(initialAliases);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAliases(initialAliases);
    setDraft("");
  }, [topicId, initialAliases]);

  function addAlias() {
    const next = normalizeAlias(draft);
    if (!next || aliases.some((alias) => alias.toLowerCase() === next)) {
      setDraft("");
      return;
    }
    setAliases((current) => [...current, next]);
    setDraft("");
  }

  function removeAlias(alias: string) {
    setAliases((current) => current.filter((value) => value !== alias));
  }

  async function saveAliases() {
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("entityId", topicId);
      formData.set("linkedTags", aliases.join(", "));
      formData.set("returnTo", returnTo);
      await updateTopicAliasesAction(formData);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const dirty =
    aliases.length !== initialAliases.length ||
    aliases.some((alias, index) => alias !== initialAliases[index]);

  const copy = {
    heading: TOPIC_ALIASES.heading,
    hint: TOPIC_ALIASES.hint,
    placeholder: TOPIC_ALIASES.placeholder,
    add: TOPIC_ALIASES.add,
    empty: TOPIC_ALIASES.empty,
    removeAria: TOPIC_ALIASES.removeAria,
  };

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-4">
      <V2VocabularyListEditor
        items={aliases}
        draft={draft}
        onDraftChange={setDraft}
        onAdd={addAlias}
        onRemove={removeAlias}
        copy={copy}
        inputAriaLabel={`Add alias for ${topicName}`}
        footer={
          <button
            type="button"
            onClick={() => void saveAliases()}
            disabled={!dirty || busy}
            className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
          >
            {busy ? "Saving…" : TOPIC_ALIASES.save}
          </button>
        }
      />
    </div>
  );
}
