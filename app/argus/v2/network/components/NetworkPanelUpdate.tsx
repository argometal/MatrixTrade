"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { importNetworkAiBlockAction } from "@/app/argus/actions";
import {
  NETWORK_AI_BLOCK_SAMPLE_OPTIONS,
  parseNetworkAiBlock,
  previewNetworkAiBlock,
  sampleNetworkAiBlock,
  type NetworkAiBlockPayload,
  type NetworkAiBlockType,
} from "@/lib/argus/network-ai-block";

type UpdatePhase = "paste" | "success";

export function NetworkPanelUpdate({
  onBack,
  defaultEntityId,
}: {
  onBack: () => void;
  defaultEntityId?: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<UpdatePhase>("paste");
  const [pasteValue, setPasteValue] = useState("");
  const [sampleType, setSampleType] = useState("");
  const [preview, setPreview] = useState<NetworkAiBlockPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleValidate() {
    setError(null);
    const result = parseNetworkAiBlock(pasteValue);
    if (!result.ok) {
      setPreview(null);
      setError(
        result.details?.length ? `${result.error}\n${result.details.join("\n")}` : result.error
      );
      return;
    }
    setPreview(result.payload);
  }

  function handleSampleSelect(type: string) {
    setSampleType(type);
    if (!type) return;
    let sample = sampleNetworkAiBlock(type as NetworkAiBlockType);
    if (defaultEntityId) {
      sample = sample.replace(/PERSON_ID/g, defaultEntityId);
    }
    setPasteValue(sample);
    setPreview(null);
    setError(null);
    setSuccessMessage(null);
  }

  function handleApply() {
    if (!preview) return;
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("aiBlock", pasteValue);
      const result = await importNetworkAiBlockAction(formData);
      if (!result.ok) {
        setError(result.error + (result.details?.length ? `\n${result.details.join("\n")}` : ""));
        return;
      }
      setSuccessMessage(result.message);
      setPhase("success");
      router.refresh();
    });
  }

  if (phase === "success") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-4">
            <p className="text-sm font-semibold text-emerald-200">Applied</p>
            <p className="mt-1 text-sm text-emerald-100/90">{successMessage}</p>
          </div>
        </div>
        <footer className="mt-4 flex gap-3 border-t border-zinc-800 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
          >
            Done
          </button>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain">
        {error ? (
          <p className="whitespace-pre-wrap rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        ) : null}

        <textarea
          value={pasteValue}
          onChange={(event) => {
            setPasteValue(event.target.value);
            setPreview(null);
            setError(null);
          }}
          rows={12}
          placeholder='{ "type": "network-capture", "proposal": { "entityId": "...", "body": "..." } }'
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 font-mono text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
        />

        <details className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-3 py-2">
          <summary className="cursor-pointer text-[11px] text-zinc-500">
            Sample JSON shapes (debug — AI should produce these)
          </summary>
          <label className="mt-2 block space-y-1">
            <span className="text-[11px] text-zinc-600">Load sample</span>
            <select
              value={sampleType}
              onChange={(event) => handleSampleSelect(event.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-2 py-1.5 text-xs text-zinc-300"
            >
              <option value="">Choose block type…</option>
              {NETWORK_AI_BLOCK_SAMPLE_OPTIONS.map((option) => (
                <option key={option.type} value={option.type}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </details>

        {preview ? (
          <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 px-3 py-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-violet-300">Preview</p>
            <pre className="whitespace-pre-wrap font-mono text-xs text-zinc-400">
              {previewNetworkAiBlock(preview)}
            </pre>
          </div>
        ) : null}
      </div>

      <footer className="mt-4 flex gap-3 border-t border-zinc-800 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800"
        >
          Back
        </button>
        <button
          type="button"
          disabled={pending || !pasteValue.trim()}
          onClick={handleValidate}
          className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
        >
          Validate
        </button>
        <button
          type="button"
          disabled={pending || !preview}
          onClick={handleApply}
          className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {pending ? "Applying…" : "Apply"}
        </button>
      </footer>
    </div>
  );
}
