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

export function NetworkAiImportPanel({
  defaultEntityId,
  compact = false,
}: {
  defaultEntityId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const [sampleType, setSampleType] = useState("");
  const [preview, setPreview] = useState<NetworkAiBlockPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleValidate() {
    setError(null);
    setApplyMessage(null);
    const result = parseNetworkAiBlock(pasteValue);
    if (!result.ok) {
      setPreview(null);
      setError(
        result.details?.length
          ? `${result.error}\n${result.details.join("\n")}`
          : result.error
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
    setApplyMessage(null);
  }

  function handleApply() {
    if (!preview) return;
    setError(null);
    setApplyMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("aiBlock", pasteValue);
      const result = await importNetworkAiBlockAction(formData);
      if (!result.ok) {
        setError(result.error + (result.details?.length ? `\n${result.details.join("\n")}` : ""));
        return;
      }
      setApplyMessage(result.message);
      setPreview(null);
      setPasteValue("");
      router.refresh();
    });
  }

  return (
    <div className={compact ? "" : "mb-6"}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20"
        aria-expanded={open}
      >
        {open ? "▲" : "▼"} Import AI update
      </button>

      {open ? (
        <div className="mt-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4">
          <p className="mb-3 text-xs text-zinc-500">
            Paste the AI Block JSON from your assistant. Validate → preview → Apply. Nothing writes until you click Apply.
          </p>

          {error ? (
            <p className="mb-3 whitespace-pre-wrap rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          ) : null}

          {applyMessage ? (
            <p className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-200">
              {applyMessage}
            </p>
          ) : null}

          <textarea
            value={pasteValue}
            onChange={(e) => {
              setPasteValue(e.target.value);
              setPreview(null);
              setError(null);
              setApplyMessage(null);
            }}
            rows={10}
            placeholder='{ "type": "network-register", "proposal": { "entityId": "...", "title": "...", "body": "..." } }'
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 font-mono text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
          />

          <div className="mt-3 flex flex-wrap items-end gap-3">
            <button
              type="button"
              disabled={pending || !pasteValue.trim()}
              onClick={handleValidate}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              Validate
            </button>
            <button
              type="button"
              disabled={pending || !preview}
              onClick={handleApply}
              className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {pending ? "Applying…" : "Apply"}
            </button>
            <label className="block min-w-[12rem] flex-1 space-y-1">
              <span className="text-[11px] text-zinc-500">Load sample</span>
              <select
                value={sampleType}
                onChange={(e) => handleSampleSelect(e.target.value)}
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
          </div>

          {preview ? (
            <div className="mt-4 rounded-xl border border-violet-500/25 bg-violet-500/5 px-3 py-3">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-violet-300">Preview</p>
              <pre className="whitespace-pre-wrap font-mono text-xs text-zinc-400">
                {previewNetworkAiBlock(preview)}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
