"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { acceptAiBlockAction } from "@/app/actions";
import { copyText } from "@/app/components/ai-bridge/copy-text";
import { ProposalSketchCard } from "@/app/components/matrix-connect/ProposalSketchCard";
import { FundingFollowUpPanel } from "@/app/components/control-panel/FundingFollowUpPanel";
import { useControlPanel } from "@/app/components/control-panel/MatrixControlPanelProvider";
import { parseAiBlock } from "@/lib/ai-block";
import { isApplyImplemented } from "@/lib/ai-bridge-types";
import {
  buildApplyFailureRecord,
  formatApplyFailureSnapshot,
  type ApplyFailureRecord,
} from "@/lib/apply-failure-snapshot";
import { consumeControlApplyDraft, clearControlApplyDraft } from "@/lib/control-apply-draft";
import { buildProposalSketch } from "@/lib/proposal-sketch";
import { validateProposalPayload, type TradingInboxPayload } from "@/lib/bridge";
import type { FundingFollowUpResult } from "@/lib/scout-funding-follow-up";

type UpdatePhase = "paste" | "success";

type ApplyOutcome = {
  message: string;
  alreadyApplied: boolean;
  type?: string;
  tradeId?: string;
  stockFileId?: string;
  planId?: string;
  playbookId?: string;
  fundingFollowUp?: FundingFollowUpResult;
};

type ApplyStatus = "idle" | "validating" | "applying" | "success" | "failure";

/**
 * Control → Apply UI (Prompt ID 24-47).
 * Clear + auto-clear after every Apply attempt; Snap Failure for last failed payload.
 * Does not change validators, schemas, or persistence.
 */
export function ControlPanelUpdate({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const { consumePendingApplyJson } = useControlPanel();
  const [phase, setPhase] = useState<UpdatePhase>("paste");
  const [applyInput, setApplyInput] = useState("");
  const [applyStatus, setApplyStatus] = useState<ApplyStatus>("idle");
  const [applyError, setApplyError] = useState<string | null>(null);
  const [preview, setPreview] = useState<TradingInboxPayload | null>(null);
  const [outcome, setOutcome] = useState<ApplyOutcome | null>(null);
  const [lastFailedPayload, setLastFailedPayload] = useState<string | null>(null);
  const [lastFailureSnapshot, setLastFailureSnapshot] = useState<ApplyFailureRecord | null>(
    null
  );
  const [snapCopied, setSnapCopied] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const acceptingRef = useRef(false);
  const draftSeededRef = useRef(false);
  const [pending, startTransition] = useTransition();

  // 30-27 — seed Apply editor from Scout Prepare handoff (sessionStorage + memory).
  useEffect(() => {
    if (draftSeededRef.current) return;
    draftSeededRef.current = true;
    const fromMemory = consumePendingApplyJson();
    const fromStore = consumeControlApplyDraft();
    const draft = fromMemory ?? fromStore;
    if (draft) {
      clearControlApplyDraft();
      setApplyInput(draft);
      setPhase("paste");
      setApplyStatus("idle");
      setApplyError(null);
      setPreview(null);
    }
  }, [consumePendingApplyJson]);

  const sketch = useMemo(() => (preview ? buildProposalSketch(preview) : null), [preview]);
  const validation = useMemo(
    () => (preview ? validateProposalPayload(preview) : { ok: false as const, errors: ["Validate first"] }),
    [preview]
  );
  const applyReady = Boolean(preview && validation.ok && isApplyImplemented(preview.type));
  const isBusy = pending || accepting;
  const canSnapFailure = Boolean(lastFailureSnapshot && lastFailedPayload !== null);

  function clearFailureState() {
    setLastFailedPayload(null);
    setLastFailureSnapshot(null);
    setSnapCopied(false);
  }

  /** Manual Clear — full reset to initial Apply state. */
  function handleClear() {
    if (isBusy) return;
    setPhase("paste");
    setApplyInput("");
    setApplyStatus("idle");
    setApplyError(null);
    setPreview(null);
    setOutcome(null);
    clearFailureState();
    acceptingRef.current = false;
    setAccepting(false);
  }

  function resetForAnother() {
    handleClear();
  }

  /**
   * Capture Snap Failure payload. Apply path clears the editor; Validate keeps it
   * so the user can fix bad JSON without losing the paste.
   */
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
    const result = parseAiBlock(submitted);
    if (!result.ok) {
      // Keep editor; still enable Snap Failure (incl. invalid JSON).
      setPreview(null);
      recordFailure(
        {
          submittedJson: submitted,
          kind: "parse",
          errorMessage: result.error,
          details: result.details,
        },
        { clearEditor: false }
      );
      return;
    }
    setPreview(result.payload);
    setApplyStatus("idle");
    const payloadCheck = validateProposalPayload(result.payload);
    if (!payloadCheck.ok) {
      recordFailure(
        {
          submittedJson: submitted,
          kind: "validation",
          errorMessage: "Validation failed",
          details: payloadCheck.errors,
          blockType: result.payload.type,
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

    const parseResult = parseAiBlock(submitted);
    if (!parseResult.ok) {
      recordFailure({
        submittedJson: submitted,
        kind: "parse",
        errorMessage: parseResult.error,
        details: parseResult.details,
      });
      return;
    }

    const payload = parseResult.payload;
    setPreview(payload);

    const payloadCheck = validateProposalPayload(payload);
    if (!payloadCheck.ok) {
      recordFailure({
        submittedJson: submitted,
        kind: "validation",
        errorMessage: "Validation failed",
        details: payloadCheck.errors,
        blockType: payload.type,
      });
      return;
    }

    if (!isApplyImplemented(payload.type)) {
      recordFailure({
        submittedJson: submitted,
        kind: "server",
        errorMessage: `Apply is not implemented for type ${payload.type}.`,
        blockType: payload.type,
      });
      return;
    }

    acceptingRef.current = true;
    setAccepting(true);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("aiBlock", submitted);
        const result = await acceptAiBlockAction(formData);
        if (!result.ok) {
          recordFailure({
            submittedJson: submitted,
            kind: "server",
            errorMessage: result.error,
            details: result.details,
            blockType: payload.type,
          });
          return;
        }
        clearFailureState();
        setApplyInput("");
        setPreview(null);
        setApplyError(null);
        setApplyStatus("success");
        setOutcome({
          message: result.message,
          alreadyApplied: Boolean(result.alreadyApplied),
          type: result.type,
          tradeId: result.tradeId,
          stockFileId: result.stockFileId,
          planId: result.planId,
          playbookId: result.playbookId,
          fundingFollowUp: result.fundingFollowUp,
        });
        setPhase("success");
        router.refresh();
      } catch (err) {
        recordFailure({
          submittedJson: submitted,
          kind: "unexpected",
          errorMessage: err instanceof Error ? err.message : "Apply failed unexpectedly.",
          blockType: payload.type,
          technicalNote: err instanceof Error && err.stack ? err.stack.split("\n").slice(0, 6).join("\n") : undefined,
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

  if (phase === "success" && outcome) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain">
          <div
            className={`rounded-2xl border px-4 py-4 ${
              outcome.alreadyApplied
                ? "border-amber-500/30 bg-amber-950/30"
                : "border-emerald-500/30 bg-emerald-950/30"
            }`}
          >
            <p
              className={`text-sm font-semibold ${
                outcome.alreadyApplied ? "text-amber-200" : "text-emerald-200"
              }`}
            >
              {outcome.alreadyApplied ? "Already applied" : "Updated"}
            </p>
            <p
              className={`mt-1 text-sm ${
                outcome.alreadyApplied ? "text-amber-100/90" : "text-emerald-100/90"
              }`}
            >
              {outcome.message}
            </p>
            {outcome.alreadyApplied ? (
              <p className="mt-2 text-xs text-amber-200/80">
                This exact block was applied before. No duplicate write was made.
              </p>
            ) : null}
          </div>

          {outcome.type === "decision-update" && outcome.fundingFollowUp ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-300">
                {outcome.fundingFollowUp.eligible
                  ? "Funding proposal available"
                  : "Funding follow-up"}
              </p>
              <FundingFollowUpPanel
                followUp={outcome.fundingFollowUp}
                onPrepare={(json) => {
                  setApplyInput(json);
                  setPhase("paste");
                  setOutcome(null);
                  setApplyStatus("idle");
                  setPreview(null);
                  setApplyError(null);
                }}
                onDismiss={() => {
                  setOutcome((o) =>
                    o ? { ...o, fundingFollowUp: undefined } : o
                  );
                }}
              />
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 text-xs">
            {outcome.tradeId ? (
              <Link
                href={`/trades/${outcome.tradeId}`}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-violet-400 hover:text-violet-300"
              >
                Open trade {outcome.tradeId}
              </Link>
            ) : null}
            {outcome.stockFileId ? (
              <Link
                href={`/stock-theses/${outcome.stockFileId}`}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-violet-400 hover:text-violet-300"
              >
                Open profile {outcome.stockFileId}
              </Link>
            ) : null}
            {outcome.planId ? (
              <Link
                href="/planning"
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-violet-400 hover:text-violet-300"
              >
                Scouting desk · {outcome.planId}
              </Link>
            ) : null}
            {outcome.playbookId ? (
              <Link
                href="/playbook"
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-violet-400 hover:text-violet-300"
              >
                Playbook · {outcome.playbookId}
              </Link>
            ) : null}
            <Link
              href="/inbox"
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-400 hover:text-zinc-200"
            >
              View history
            </Link>
          </div>
        </div>
        <footer className="mt-4 flex gap-3 border-t border-zinc-800 pt-4">
          <button
            type="button"
            onClick={resetForAnother}
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
          Paste AI Block. Validate, then Accept writes to MTA. Editor clears after every Apply
          attempt. On invalid JSON or validation errors, use Snap Failure to copy the report.
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
          placeholder='{ "type": "decision-update", "proposal": { ... } }'
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

        {sketch ? <ProposalSketchCard sketch={sketch} /> : null}
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
