"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { updateEventSignalsAction } from "@/app/argus/actions";
import { EVENT_SIGNALS } from "@/lib/argus/ux-copy";
import { V2VocabularyListEditor } from "@/app/argus/v2/components/V2VocabularyListEditor";

function normalizeSignal(value: string): string {
  return value.trim();
}

export function V2EventSignalEditor({
  eventId,
  eventName,
  initialSignals,
  returnTo,
}: {
  eventId: string;
  eventName: string;
  initialSignals: string[];
  returnTo: string;
}) {
  const router = useRouter();
  const [signals, setSignals] = useState<string[]>(initialSignals);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSignals(initialSignals);
    setDraft("");
  }, [eventId, initialSignals]);

  function addSignal() {
    const next = normalizeSignal(draft);
    if (!next || signals.some((s) => s.toLowerCase() === next.toLowerCase())) {
      setDraft("");
      return;
    }
    setSignals((current) => [...current, next]);
    setDraft("");
  }

  function removeSignal(item: string) {
    setSignals((current) => current.filter((value) => value !== item));
  }

  async function saveSignals() {
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("entityId", eventId);
      formData.set("linkedTags", signals.join(", "));
      formData.set("returnTo", returnTo);
      await updateEventSignalsAction(formData);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const dirty =
    signals.length !== initialSignals.length ||
    signals.some((signal, index) => signal !== initialSignals[index]);

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-4">
      <V2VocabularyListEditor
        items={signals}
        draft={draft}
        onDraftChange={setDraft}
        onAdd={addSignal}
        onRemove={removeSignal}
        copy={{
          heading: EVENT_SIGNALS.heading,
          hint: EVENT_SIGNALS.hint,
          placeholder: EVENT_SIGNALS.placeholder,
          add: EVENT_SIGNALS.add,
          empty: EVENT_SIGNALS.empty,
          removeAria: EVENT_SIGNALS.removeAria,
        }}
        inputAriaLabel={`Add signal for ${eventName}`}
        footer={
          <button
            type="button"
            onClick={() => void saveSignals()}
            disabled={!dirty || busy}
            className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save signals"}
          </button>
        }
      />
    </div>
  );
}
