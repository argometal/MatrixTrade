"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { acceptAiBlockAction } from "@/app/actions";
import { ProposalSketchCard } from "@/app/components/matrix-connect/ProposalSketchCard";
import { parseAiBlock } from "@/lib/ai-block";
import { isApplyImplemented } from "@/lib/ai-bridge-types";
import { buildProposalSketch } from "@/lib/proposal-sketch";
import { validateProposalPayload, type TradingInboxPayload } from "@/lib/bridge";

type UpdatePhase = "paste" | "success";

type ApplyOutcome = {
  message: string;
  alreadyApplied: boolean;
  type?: string;
  tradeId?: string;
  stockFileId?: string;
  planId?: string;
  playbookId?: string;
};

export function ControlPanelUpdate({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [phase, setPhase] = useState<UpdatePhase>("paste");
  const [pasteValue, setPasteValue] = useState("");
  const [preview, setPreview] = useState<TradingInboxPayload | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<ApplyOutcome | null>(null);
  const [accepting, setAccepting] = useState(false);
  const acceptingRef = useRef(false);
  const [pending, startTransition] = useTransition();

  const sketch = useMemo(() => (preview ? buildProposalSketch(preview) : null), [preview]);
  const validation = useMemo(
    () => (preview ? validateProposalPayload(preview) : { ok: false as const, errors: ["Validate first"] }),
    [preview]
  );
  const applyReady = Boolean(preview && validation.ok && isApplyImplemented(preview.type));
  const isBusy = pending || accepting;

  function resetForAnother() {
    setPhase("paste");
    setPasteValue("");
    setPreview(null);
    setParseError(null);
    setAcceptError(null);
    setOutcome(null);
    acceptingRef.current = false;
    setAccepting(false);
  }

  function handleValidate() {
    setParseError(null);
    setAcceptError(null);
    const result = parseAiBlock(pasteValue);
    if (!result.ok) {
      setPreview(null);
      setParseError(
        result.details?.length ? `${result.error}\n${result.details.join("\n")}` : result.error
      );
      return;
    }
    setPreview(result.payload);
    const payloadCheck = validateProposalPayload(result.payload);
    if (!payloadCheck.ok) {
      setAcceptError(payloadCheck.errors.join("\n"));
    }
  }

  function resolvePreviewForAccept(): TradingInboxPayload | null {
    if (preview) return preview;
    const result = parseAiBlock(pasteValue);
    if (!result.ok) {
      setParseError(
        result.details?.length ? `${result.error}\n${result.details.join("\n")}` : result.error
      );
      return null;
    }
    setPreview(result.payload);
    return result.payload;
  }

  function handleAccept() {
    if (!pasteValue.trim() || isBusy || acceptingRef.current) return;

    const payload = resolvePreviewForAccept();
    if (!payload) return;

    const payloadCheck = validateProposalPayload(payload);
    if (!payloadCheck.ok) {
      setAcceptError(payloadCheck.errors.join("\n"));
      return;
    }
    if (!isApplyImplemented(payload.type)) {
      setAcceptError(`Apply is not implemented for type ${payload.type}.`);
      return;
    }

    acceptingRef.current = true;
    setAccepting(true);
    setAcceptError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("aiBlock", pasteValue);
        const result = await acceptAiBlockAction(formData);
        if (!result.ok) {
          setAcceptError(
            result.details?.length ? `${result.error}\n${result.details.join("\n")}` : result.error
          );
          return;
        }
        setOutcome({
          message: result.message,
          alreadyApplied: Boolean(result.alreadyApplied),
          type: result.type,
          tradeId: result.tradeId,
          stockFileId: result.stockFileId,
          planId: result.planId,
          playbookId: result.playbookId,
        });
        setPhase("success");
        router.refresh();
      } finally {
        acceptingRef.current = false;
        setAccepting(false);
      }
    });
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
          Paste any AI Block — trades, stock files, scouts, playbooks, evidence. Validate to preview,
          then Accept writes to MatrixTrade.
        </p>

        {isBusy ? (
          <div className="rounded-xl border border-violet-500/30 bg-violet-950/30 px-3 py-2 text-xs text-violet-200">
            Applying… do not click again until this finishes.
          </div>
        ) : null}

        {parseError ? (
          <p className="whitespace-pre-wrap rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs text-red-300">
            {parseError}
          </p>
        ) : null}

        {acceptError ? (
          <p className="whitespace-pre-wrap rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs text-red-300">
            {acceptError}
          </p>
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
          value={pasteValue}
          onChange={(event) => {
            if (isBusy) return;
            setPasteValue(event.target.value);
            setPreview(null);
            setParseError(null);
            setAcceptError(null);
          }}
          disabled={isBusy}
          rows={10}
          placeholder='{ "type": "decision-update", "proposal": { ... } }'
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-3 font-mono text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none disabled:opacity-60"
        />

        <button
          type="button"
          disabled={isBusy || !pasteValue.trim()}
          onClick={handleValidate}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
        >
          Validate
        </button>

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
          disabled={isBusy || !pasteValue.trim()}
          onClick={handleAccept}
          className="flex-[2] rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
        >
          {isBusy ? "Applying…" : applyReady ? "Accept" : "Accept (validate first)"}
        </button>
      </footer>
    </div>
  );
}
