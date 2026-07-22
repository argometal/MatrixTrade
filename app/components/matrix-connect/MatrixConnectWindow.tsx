"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { acceptAiBlockAction } from "@/app/actions";
import { copyText } from "@/app/components/ai-bridge/copy-text";
import { ProposalSketchCard } from "@/app/components/matrix-connect/ProposalSketchCard";
import { parseAiBlock } from "@/lib/ai-block";
import { isApplyImplemented } from "@/lib/ai-bridge-types";
import {
  CONNECT_INTENT_OPTIONS,
  type ConnectFlowOpenOptions,
  type ConnectIntent,
} from "@/lib/matrix-connect-types";
import { buildProposalSketch } from "@/lib/proposal-sketch";
import type { SnapshotMenuItem } from "@/lib/snapshot-types";
import { validateProposalPayload, type TradingInboxPayload } from "@/lib/bridge";

type Step = "intent" | "snapshot" | "import" | "success";

function connectTitle(options: ConnectFlowOpenOptions): string {
  if (options.ticker) return `Connect · ${options.ticker}`;
  if (options.tradeId) return `Connect · ${options.tradeId}`;
  if (options.planId) return `Connect · ${options.planId}`;
  return "Connect";
}

function SnapshotCopyList({
  items,
  title,
  description,
}: {
  items: SnapshotMenuItem[];
  title: string;
  description: string;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyItem(item: SnapshotMenuItem) {
    const ok = await copyText(item.text);
    if (ok) {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  if (items.length === 1) {
    const item = items[0]!;
    return (
      <button
        type="button"
        onClick={() => void copyItem(item)}
        className="w-full rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-3 text-left hover:bg-violet-500/20"
      >
        <span className="block text-sm font-medium text-violet-200">
          {copiedId === item.id ? "Copied ✓" : title}
        </span>
        <span className="mt-1 block text-xs text-zinc-500">{description}</span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500">{description}</p>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => void copyItem(item)}
          className="flex w-full items-start justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-left hover:border-violet-500/40 hover:bg-violet-950/20"
        >
          <span>
            <span className="block text-sm font-medium text-zinc-100">{item.label}</span>
            <span className="mt-0.5 block text-xs text-zinc-500">{item.description}</span>
          </span>
          <span className="shrink-0 text-xs font-medium text-violet-300">
            {copiedId === item.id ? "Copied ✓" : "Copy"}
          </span>
        </button>
      ))}
    </div>
  );
}

function IntentPicker({
  value,
  onChange,
}: {
  value: ConnectIntent;
  onChange: (intent: ConnectIntent) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {CONNECT_INTENT_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`rounded-xl border px-3 py-3 text-left transition ${
            value === option.id
              ? "border-violet-500/50 bg-violet-600/15 ring-1 ring-violet-500/30"
              : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
          }`}
        >
          <span className="block text-sm font-medium text-zinc-100">{option.label}</span>
          <span className="mt-1 block text-xs text-zinc-500">{option.hint}</span>
        </button>
      ))}
    </div>
  );
}

export function MatrixConnectWindow({
  open,
  options,
  onClose,
}: {
  open: boolean;
  options: ConnectFlowOpenOptions;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("intent");
  const [intent, setIntent] = useState<ConnectIntent>(options.intent ?? "general");
  const [pasteValue, setPasteValue] = useState("");
  const [preview, setPreview] = useState<TradingInboxPayload | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const acceptingRef = useRef(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setStep(options.intent ? "snapshot" : "intent");
    setIntent(options.intent ?? "general");
    setPasteValue("");
    setPreview(null);
    setParseError(null);
    setAcceptError(null);
    setSuccessMessage(null);
    setAlreadyApplied(false);
    setAccepting(false);
    acceptingRef.current = false;
  }, [open, options]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

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
    const isBusy = pending || accepting;
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
        setSuccessMessage(result.message);
        setAlreadyApplied(Boolean(result.alreadyApplied));
        setStep("success");
        router.refresh();
      } finally {
        acceptingRef.current = false;
        setAccepting(false);
      }
    });
  }

  if (!open || !mounted) return null;

  const title = connectTitle(options);

  const content = (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[#030308] lg:bg-black/70 lg:backdrop-blur-sm">
      <div className="flex min-h-0 flex-1 flex-col lg:items-center lg:justify-center lg:p-6">
        <div className="flex min-h-0 w-full flex-1 flex-col bg-[#030308] lg:max-h-[min(90vh,820px)] lg:max-w-3xl lg:flex-none lg:rounded-2xl lg:border lg:border-zinc-800 lg:shadow-2xl">
          <header className="flex shrink-0 items-center justify-between border-b border-zinc-800/80 px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-lg font-semibold text-zinc-50">{title}</h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Copy snapshot → external AI → paste response → Accept
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200"
            >
              Close
            </button>
          </header>

          <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            {step === "intent" ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">What do you want to do?</h3>
                  <p className="mt-1 text-xs text-zinc-500">Guides your AI request — you still paste one block back.</p>
                </div>
                <IntentPicker value={intent} onChange={setIntent} />
              </div>
            ) : null}

            {step === "snapshot" ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">Copy context for your AI</h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    Paste in your assistant, ask in plain language, get one JSON block back.
                  </p>
                </div>
                <SnapshotCopyList
                  items={options.snapshotItems}
                  title={options.snapshotTitle}
                  description={options.snapshotDescription}
                />
              </div>
            ) : null}

            {step === "import" ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">Paste AI response</h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    Validate to preview. Accept writes to MTA — no Inbox trip required.
                  </p>
                </div>

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

                {pending || accepting ? (
                  <div className="rounded-xl border border-violet-500/30 bg-violet-950/30 px-3 py-2 text-xs text-violet-200">
                    Applying… do not click again until this finishes.
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
                  value={pasteValue}
                  onChange={(event) => {
                    if (pending || accepting) return;
                    setPasteValue(event.target.value);
                    setPreview(null);
                    setParseError(null);
                    setAcceptError(null);
                  }}
                  disabled={pending || accepting}
                  rows={12}
                  placeholder='{ "type": "decision-update", "proposal": { ... } }'
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-3 font-mono text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending || !pasteValue.trim()}
                    onClick={handleValidate}
                    className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                  >
                    Validate
                  </button>
                </div>

                {sketch ? <ProposalSketchCard sketch={sketch} /> : null}

                <details className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-3 py-2">
                  <summary className="cursor-pointer text-xs text-zinc-500">View raw JSON</summary>
                  <pre className="mt-2 max-h-48 overflow-auto text-[11px] text-zinc-500">
                    {pasteValue}
                  </pre>
                </details>
              </div>
            ) : null}

            {step === "success" ? (
              <div className="space-y-4">
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
                    {alreadyApplied ? "Already applied" : "Accepted"}
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
                  Proposal saved to history if you need to audit later.{" "}
                  <Link href="/inbox" className="text-violet-400 hover:underline">
                    View history
                  </Link>
                </p>
              </div>
            ) : null}
          </div>

          <footer className="shrink-0 border-t border-zinc-800/80 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
            {step === "intent" ? (
              <button
                type="button"
                onClick={() => setStep("snapshot")}
                className="w-full rounded-2xl bg-violet-600 py-3.5 text-sm font-bold text-white"
              >
                Next — copy snapshot
              </button>
            ) : null}

            {step === "snapshot" ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep("intent")}
                  className="flex-1 rounded-2xl border border-zinc-700 py-3.5 text-sm font-medium text-zinc-300"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep("import")}
                  className="flex-[2] rounded-2xl bg-violet-600 py-3.5 text-sm font-bold text-white"
                >
                  Next — paste response
                </button>
              </div>
            ) : null}

            {step === "import" ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep("snapshot")}
                  className="flex-1 rounded-2xl border border-zinc-700 py-3.5 text-sm font-medium text-zinc-300"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={pending || accepting || !pasteValue.trim()}
                  onClick={handleAccept}
                  className="flex-[2] rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white disabled:opacity-40"
                >
                  {pending || accepting ? "Applying…" : applyReady ? "Accept" : "Accept (validate first)"}
                </button>
              </div>
            ) : null}

            {step === "success" ? (
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-2xl bg-violet-600 py-3.5 text-sm font-bold text-white"
              >
                Done
              </button>
            ) : null}
          </footer>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
