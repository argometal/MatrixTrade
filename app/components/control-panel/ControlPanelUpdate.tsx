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

export function ControlPanelUpdate({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [phase, setPhase] = useState<UpdatePhase>("paste");
  const [pasteValue, setPasteValue] = useState("");
  const [preview, setPreview] = useState<TradingInboxPayload | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const acceptingRef = useRef(false);
  const [pending, startTransition] = useTransition();

  const sketch = useMemo(() => (preview ? buildProposalSketch(preview) : null), [preview]);
  const validation = useMemo(
    () => (preview ? validateProposalPayload(preview) : { ok: false as const, errors: ["Validate first"] }),
    [preview]
  );
  const applyReady = Boolean(preview && validation.ok && isApplyImplemented(preview.type));

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
  }

  function handleAccept() {
    if (!pasteValue.trim() || !applyReady || pending || accepting || acceptingRef.current) return;
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
        setSuccessMessage(result.message);
        setAlreadyApplied(Boolean(result.alreadyApplied));
        setPhase("success");
        router.refresh();
      } finally {
        acceptingRef.current = false;
        setAccepting(false);
      }
    });
  }

  if (phase === "success") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain">
          <div
            className={`rounded-2xl border px-4 py-4 ${
              alreadyApplied
                ? "border-amber-500/30 bg-amber-950/30"
                : "border-emerald-500/30 bg-emerald-950/30"
            }`}
          >
            <p
              className={`text-sm font-semibold ${
                alreadyApplied ? "text-amber-200" : "text-emerald-200"
              }`}
            >
              {alreadyApplied ? "Already applied" : "Updated"}
            </p>
            <p
              className={`mt-1 text-sm ${
                alreadyApplied ? "text-amber-100/90" : "text-emerald-100/90"
              }`}
            >
              {successMessage}
            </p>
          </div>
          <p className="text-xs text-zinc-500">
            Saved to proposal history.{" "}
            <Link href="/inbox" className="text-violet-400 hover:underline">
              View history
            </Link>
          </p>
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
        <p className="text-xs text-zinc-500">
          Paste any AI Block — trades, stock files, scouts, playbooks, evidence. Validate to preview,
          then Accept writes to MatrixTrade.
        </p>

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

        <textarea
          value={pasteValue}
          onChange={(event) => {
            setPasteValue(event.target.value);
            setPreview(null);
            setParseError(null);
            setAcceptError(null);
          }}
          rows={10}
          placeholder='{ "type": "decision-update", "proposal": { ... } }'
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-3 font-mono text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
        />

        <button
          type="button"
          disabled={pending || !pasteValue.trim()}
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
          onClick={onBack}
          className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800"
        >
          Back
        </button>
        <button
          type="button"
          disabled={pending || accepting || !applyReady}
          onClick={handleAccept}
          className="flex-[2] rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
        >
          {pending || accepting ? "Applying…" : "Accept"}
        </button>
      </footer>
    </div>
  );
}
