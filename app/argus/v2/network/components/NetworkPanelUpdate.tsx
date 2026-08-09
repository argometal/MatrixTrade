"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { importNetworkAiBlockAction } from "@/app/argus/actions";
import { copyText } from "@/app/components/ai-bridge/copy-text";
import {
  buildApplyFailureRecord,
  formatApplyFailureSnapshot,
  type ApplyFailureRecord,
} from "@/lib/apply-failure-snapshot";
import {
  NETWORK_AI_BLOCK_SAMPLE_OPTIONS,
  parseNetworkAiBlockStructure,
  previewNetworkAiBlock,
  sampleNetworkAiBlock,
  validateNetworkAiBlockProposal,
  type NetworkAiBlockPayload,
  type NetworkAiBlockType,
} from "@/lib/argus/network-ai-block";

type UpdatePhase = "paste" | "success";
type ApplyStatus = "idle" | "validating" | "applying" | "success" | "failure";

/**
 * Network Panel → Apply — mirrors MTA Control Apply:
 * paste → Validate → preview / Fix before Accept → Accept · Clear · Snap Failure.
 */
export function NetworkPanelUpdate({
  onBack,
  defaultEntityId,
}: {
  onBack: () => void;
  defaultEntityId?: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<UpdatePhase>("paste");
  const [applyInput, setApplyInput] = useState("");
  const [sampleType, setSampleType] = useState("");
  const [applyStatus, setApplyStatus] = useState<ApplyStatus>("idle");
  const [applyError, setApplyError] = useState<string | null>(null);
  const [preview, setPreview] = useState<NetworkAiBlockPayload | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastFailedPayload, setLastFailedPayload] = useState<string | null>(null);
  const [lastFailureSnapshot, setLastFailureSnapshot] = useState<ApplyFailureRecord | null>(null);
  const [snapCopied, setSnapCopied] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const acceptingRef = useRef(false);
  const [pending, startTransition] = useTransition();

  const validation = useMemo(
    () =>
      preview
        ? validateNetworkAiBlockProposal(preview.type, preview.proposal)
        : { ok: false as const, errors: ["Validate first"] },
    [preview]
  );
  const applyReady = Boolean(preview && validation.ok);
  const isBusy = pending || accepting;
  const canSnapFailure = Boolean(lastFailureSnapshot && lastFailedPayload !== null);

  function clearFailureState() {
    setLastFailedPayload(null);
    setLastFailureSnapshot(null);
    setSnapCopied(false);
  }

  function handleClear() {
    if (isBusy) return;
    setPhase("paste");
    setApplyInput("");
    setSampleType("");
    setApplyStatus("idle");
    setApplyError(null);
    setPreview(null);
    setSuccessMessage(null);
    clearFailureState();
    acceptingRef.current = false;
    setAccepting(false);
  }

  function recordFailure(
    input: {
      submittedJson: string;
      kind: "parse" | "validation" | "server" | "unexpected";
      errorMessage: string;
      details?: string[];
      blockType?: string;
      technicalNote?: string;
    },
    options?: { clearEditor?: boolean }
  ) {
    const clearEditor = options?.clearEditor !== false;
    const record = buildApplyFailureRecord(input);
    setLastFailedPayload(input.submittedJson);
    setLastFailureSnapshot(record);
    setApplyError(
      record.validatorDetails.length
        ? `${record.errorMessage}\n${record.validatorDetails.join("\n")}`
        : record.errorMessage
    );
    setApplyStatus(clearEditor ? "failure" : "idle");
    if (clearEditor) {
      setApplyInput("");
      setPreview(null);
    }
    setSnapCopied(false);
  }

  function handleValidate() {
    if (isBusy) return;
    setApplyStatus("validating");
    const submitted = applyInput;
    const structure = parseNetworkAiBlockStructure(submitted);
    if (!structure.ok) {
      setPreview(null);
      recordFailure(
        {
          submittedJson: submitted,
          kind: "parse",
          errorMessage: structure.error,
          details: structure.details,
        },
        { clearEditor: false }
      );
      return;
    }

    setPreview(structure.payload);
    setApplyStatus("idle");
    const payloadCheck = validateNetworkAiBlockProposal(
      structure.payload.type,
      structure.payload.proposal
    );
    if (!payloadCheck.ok) {
      recordFailure(
        {
          submittedJson: submitted,
          kind: "validation",
          errorMessage: "Validation failed",
          details: payloadCheck.errors,
          blockType: structure.payload.type,
        },
        { clearEditor: false }
      );
      return;
    }
    clearFailureState();
    setApplyError(null);
  }

  function handleAccept() {
    if (!applyInput.trim() || isBusy || acceptingRef.current) return;

    const submitted = applyInput;
    setApplyStatus("applying");

    const structure = parseNetworkAiBlockStructure(submitted);
    if (!structure.ok) {
      recordFailure({
        submittedJson: submitted,
        kind: "parse",
        errorMessage: structure.error,
        details: structure.details,
      });
      return;
    }

    setPreview(structure.payload);
    const payloadCheck = validateNetworkAiBlockProposal(
      structure.payload.type,
      structure.payload.proposal
    );
    if (!payloadCheck.ok) {
      recordFailure({
        submittedJson: submitted,
        kind: "validation",
        errorMessage: "Validation failed",
        details: payloadCheck.errors,
        blockType: structure.payload.type,
      });
      return;
    }

    acceptingRef.current = true;
    setAccepting(true);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("aiBlock", submitted);
        const result = await importNetworkAiBlockAction(formData);
        if (!result.ok) {
          recordFailure({
            submittedJson: submitted,
            kind: "server",
            errorMessage: result.error,
            details: result.details,
            blockType: structure.payload.type,
          });
          return;
        }
        clearFailureState();
        setApplyInput("");
        setPreview(null);
        setApplyError(null);
        setApplyStatus("success");
        setSuccessMessage(result.message);
        setPhase("success");
        router.refresh();
      } catch (err) {
        recordFailure({
          submittedJson: submitted,
          kind: "unexpected",
          errorMessage: err instanceof Error ? err.message : "Apply failed unexpectedly.",
          blockType: structure.payload.type,
          technicalNote:
            err instanceof Error && err.stack
              ? err.stack.split("\n").slice(0, 6).join("\n")
              : undefined,
        });
      } finally {
        acceptingRef.current = false;
        setAccepting(false);
      }
    });
  }

  async function handleSnapFailure() {
    if (!lastFailureSnapshot) return;
    const text = formatApplyFailureSnapshot(lastFailureSnapshot);
    const ok = await copyText(text);
    if (ok) {
      setSnapCopied(true);
      setTimeout(() => setSnapCopied(false), 2000);
    }
  }

  function handleSampleSelect(type: string) {
    if (isBusy) return;
    setSampleType(type);
    if (!type) return;
    let sample = sampleNetworkAiBlock(type as NetworkAiBlockType);
    if (defaultEntityId) {
      sample = sample.replace(/PERSON_ID/g, defaultEntityId);
    }
    setApplyInput(sample);
    setPreview(null);
    setApplyError(null);
    setApplyStatus("idle");
    clearFailureState();
  }

  if (phase === "success") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-4">
            <p className="text-sm font-semibold text-emerald-200">Accepted</p>
            <p className="mt-1 text-sm text-emerald-100/90">{successMessage}</p>
          </div>
          <p className="text-[11px] text-zinc-600">
            Network status (Active / Dormant / Archived) and Hot stay evidence-derived — metrics blocks only
            update Contact value / My value.
          </p>
        </div>
        <footer className="mt-4 flex gap-3 border-t border-zinc-800 pt-4">
          <button
            type="button"
            onClick={handleClear}
            className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Paste another
          </button>
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
        <p className="text-xs text-zinc-500">
          Paste AI Block. Validate, then Accept writes to Argus (same window pattern as MTA Control). On
          invalid JSON or field errors, use Snap Failure to copy the report. Editable fields: create /
          capture / tags / follow-up / Contact value · My value — not status.
        </p>

        {isBusy ? (
          <div className="rounded-xl border border-violet-500/30 bg-violet-950/30 px-3 py-2 text-xs text-violet-200">
            Applying… wait until finished.
          </div>
        ) : null}

        {applyError ? (
          <div className="space-y-2">
            <p className="whitespace-pre-wrap rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs text-red-300">
              {applyError}
            </p>
            {canSnapFailure ? (
              <button
                type="button"
                onClick={() => void handleSnapFailure()}
                className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-950/50"
              >
                {snapCopied ? "Failure snapshot copied" : "Snap Failure"}
              </button>
            ) : null}
          </div>
        ) : null}

        {preview && !validation.ok ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
            <p className="font-medium">Fix before Accept:</p>
            <ul className="mt-1 list-inside list-disc">
              {validation.errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <textarea
          value={applyInput}
          onChange={(event) => {
            if (isBusy) return;
            setApplyInput(event.target.value);
            setPreview(null);
            if (applyStatus !== "failure") {
              setApplyError(null);
            }
          }}
          disabled={isBusy}
          rows={10}
          placeholder='{ "type": "network-capture", "proposal": { "entityId": "...", "body": "..." } }'
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-3 font-mono text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none disabled:opacity-60"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isBusy || !applyInput.trim()}
            onClick={handleValidate}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          >
            Validate
          </button>
          <button
            type="button"
            disabled={isBusy || (!applyInput.trim() && !applyError && !preview)}
            onClick={handleClear}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          >
            Clear
          </button>
          {canSnapFailure ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleSnapFailure()}
              className="rounded-lg border border-amber-500/40 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-950/40 disabled:opacity-50"
            >
              {snapCopied ? "Failure snapshot copied" : "Snap Failure"}
            </button>
          ) : null}
        </div>

        <details className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-3 py-2">
          <summary className="cursor-pointer text-[11px] text-zinc-500">
            Sample JSON shapes (debug — AI should produce these)
          </summary>
          <label className="mt-2 block space-y-1">
            <span className="text-[11px] text-zinc-600">Load sample</span>
            <select
              value={sampleType}
              onChange={(event) => handleSampleSelect(event.target.value)}
              disabled={isBusy}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-2 py-1.5 text-xs text-zinc-300 disabled:opacity-50"
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

        {preview && validation.ok ? (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-emerald-300">
              Ready to Accept
            </p>
            <pre className="whitespace-pre-wrap font-mono text-xs text-zinc-300">
              {previewNetworkAiBlock(preview)}
            </pre>
          </div>
        ) : null}
      </div>

      <footer className="mt-4 flex gap-3 border-t border-zinc-800 pt-4">
        <button
          type="button"
          disabled={isBusy}
          onClick={onBack}
          className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          disabled={isBusy || !applyInput.trim()}
          onClick={handleAccept}
          className="flex-[2] rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
        >
          {isBusy ? "Applying…" : applyReady ? "Accept" : "Accept (validate first)"}
        </button>
      </footer>
    </div>
  );
}
