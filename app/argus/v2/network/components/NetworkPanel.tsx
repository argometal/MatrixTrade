"use client";

import { useEffect, useState } from "react";
import { copyText } from "@/app/components/ai-bridge/copy-text";
import type { SnapshotMenuItem } from "@/lib/snapshot-types";
import { useNetworkPanel } from "./NetworkPanelProvider";
import { NetworkPanelUpdate } from "./NetworkPanelUpdate";

type Step = "pick" | "apply";

function SnapshotCopyRow({
  item,
  tone = "default",
}: {
  item: SnapshotMenuItem;
  tone?: "default" | "primary" | "request";
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyText(item.text);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const shell =
    tone === "primary"
      ? "border-violet-500/40 bg-violet-600/15 hover:border-violet-500/60 hover:bg-violet-600/25"
      : tone === "request"
        ? "border-sky-500/40 bg-sky-600/15 hover:border-sky-500/60 hover:bg-sky-600/25"
        : "border-zinc-800/80 bg-zinc-900/40 hover:border-violet-500/30 hover:bg-zinc-900";
  const icon =
    tone === "primary"
      ? "bg-violet-600/25 text-violet-200"
      : tone === "request"
        ? "bg-sky-600/25 text-sky-200"
        : "bg-violet-600/20 text-violet-300";
  const title =
    tone === "primary"
      ? "text-violet-50"
      : tone === "request"
        ? "text-sky-50"
        : "text-zinc-100";
  const desc =
    tone === "primary"
      ? "text-violet-200/70"
      : tone === "request"
        ? "text-sky-200/70"
        : "text-zinc-500";

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${shell}`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${icon}`}>
        ⎘
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-semibold ${title}`}>
          {copied ? "Copied ✓" : item.label}
        </span>
        <span className={`mt-0.5 block text-xs ${desc}`}>{item.description}</span>
      </span>
    </button>
  );
}

export function NetworkPanel() {
  const {
    open,
    closePanel,
    mechanics,
    request,
    additionalItems,
    snapshotItems,
    defaultEntityId,
    panelTitle,
  } = useNetworkPanel();
  const [step, setStep] = useState<Step>("pick");

  useEffect(() => {
    if (!open) return;
    setStep("pick");
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  function handleBack() {
    if (step === "apply") {
      setStep("pick");
      return;
    }
    closePanel();
  }

  const hasPackage = Boolean(mechanics && request);
  const title = step === "apply" ? "Apply AI response" : panelTitle;
  const hint =
    step === "apply"
      ? "Paste the Apply JSON your AI returned — validate, then Apply"
      : "Mechanics orients the AI · Request starts work · copy extra blocks only when asked";

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-end justify-center bg-black/50 p-4 pb-24 sm:items-center sm:pb-4 lg:pb-4"
      role="dialog"
      aria-modal="true"
      aria-label="Network panel"
      onClick={closePanel}
    >
      <div
        className="flex max-h-[min(560px,88vh)] w-full max-w-lg flex-col rounded-2xl border border-zinc-700/80 bg-zinc-950 p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mb-3 shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">Network panel</p>
          <h2 className="text-base font-bold text-zinc-50">{title}</h2>
          <p className="mt-1 text-[11px] text-zinc-500">{hint}</p>
        </header>

        {step === "pick" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain">
              {hasPackage ? (
                <>
                  {mechanics ? <SnapshotCopyRow item={mechanics} tone="primary" /> : null}
                  {request ? <SnapshotCopyRow item={request} tone="request" /> : null}
                  <button
                    type="button"
                    onClick={() => setStep("apply")}
                    className="flex w-full shrink-0 items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-600/15 px-4 py-3 text-left transition hover:border-emerald-500/60 hover:bg-emerald-600/25"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600/25 text-sm font-bold text-emerald-200">
                      ↑
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-emerald-100">Apply</span>
                      <span className="mt-0.5 block text-xs text-emerald-200/70">
                        Paste AI JSON — create or capture after human review
                      </span>
                    </span>
                  </button>
                  {additionalItems.length > 0 ? (
                    <div className="pt-2">
                      <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                        Additional context
                      </p>
                      <div className="space-y-2">
                        {additionalItems.map((item) => (
                          <SnapshotCopyRow key={item.id} item={item} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setStep("apply")}
                    className="flex w-full shrink-0 items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-600/15 px-4 py-3 text-left transition hover:border-emerald-500/60 hover:bg-emerald-600/25"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600/25 text-sm font-bold text-emerald-200">
                      ↑
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-emerald-100">Apply</span>
                      <span className="mt-0.5 block text-xs text-emerald-200/70">
                        Paste AI JSON — create or capture after human review
                      </span>
                    </span>
                  </button>
                  {snapshotItems.map((item) => (
                    <SnapshotCopyRow key={item.id} item={item} />
                  ))}
                </>
              )}
            </div>
            <footer className="shrink-0 border-t border-zinc-800 pt-4">
              <button
                type="button"
                onClick={handleBack}
                className="w-full rounded-xl border border-zinc-700 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800"
              >
                Close
              </button>
            </footer>
          </div>
        ) : null}

        {step === "apply" ? (
          <NetworkPanelUpdate onBack={handleBack} defaultEntityId={defaultEntityId} />
        ) : null}
      </div>
    </div>
  );
}
