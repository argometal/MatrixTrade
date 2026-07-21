"use client";

import { useEffect, useMemo, useState } from "react";
import { copyText } from "@/app/components/ai-bridge/copy-text";
import { ControlPanelUpdate } from "@/app/components/control-panel/ControlPanelUpdate";
import { useControlPanel } from "@/app/components/control-panel/MatrixControlPanelProvider";
import type { ControlPanelSectionId } from "@/lib/control-panel-types";
import type { SnapshotMenuItem } from "@/lib/snapshot-types";

type Step = "pick" | "update" | "stock-pick" | "detail";

/**
 * Labels must name the payload. Forbidden: Session, Case, Closed trade, and other
 * vague renames — see md/matrix/control-panel-ia.md.
 */
const SECTIONS: {
  id: ControlPanelSectionId;
  label: string;
  hint: string;
}[] = [
  {
    id: "train-ai",
    label: "Mechanics brief",
    hint: "Matrix rules — copy once for a new AI chat",
  },
  {
    id: "playbook",
    label: "Playbook",
    hint: "Method rules, checklists, and stats",
  },
  {
    id: "stock-file",
    label: "Stock file",
    hint: "One ticker — thesis, zones, linked scouts",
  },
  {
    id: "scouting",
    label: "Scout desk",
    hint: "Active cases and monthly risk room",
  },
];

function SnapshotCopyRow({
  item,
  onCopied,
}: {
  item: SnapshotMenuItem;
  onCopied?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyText(item.text);
    if (!ok) return;
    setCopied(true);
    onCopied?.();
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="flex w-full items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 text-left transition hover:border-violet-500/30 hover:bg-zinc-900"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-600/20 text-sm font-bold text-violet-300">
        ⎘
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-zinc-100">
          {copied ? "Copied ✓" : item.label}
        </span>
        <span className="mt-0.5 block text-xs text-zinc-500">{item.description}</span>
      </span>
    </button>
  );
}

function PlainCopyRow({
  label,
  description,
  text,
}: {
  label: string;
  description: string;
  text: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyText(text);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="flex w-full items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 text-left transition hover:border-violet-500/30 hover:bg-zinc-900"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-600/20 text-sm font-bold text-violet-300">
        ⎘
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-zinc-100">
          {copied ? "Copied ✓" : label}
        </span>
        <span className="mt-0.5 block text-xs text-zinc-500">{description}</span>
      </span>
    </button>
  );
}

export function MatrixControlPanel() {
  const { open, closePanel, data } = useControlPanel();
  const [step, setStep] = useState<Step>("pick");
  const [section, setSection] = useState<ControlPanelSectionId | null>(null);
  const [stockThesisId, setStockThesisId] = useState<string | null>(null);
  const [stockQuery, setStockQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep("pick");
    setSection(null);
    setStockThesisId(null);
    setStockQuery("");
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const sectionMeta = SECTIONS.find((entry) => entry.id === section);
  const selectedStock = useMemo(
    () => data.stockFile.theses.find((entry) => entry.thesis.id === stockThesisId) ?? null,
    [data.stockFile.theses, stockThesisId]
  );

  const filteredStocks = useMemo(() => {
    const query = stockQuery.trim().toLowerCase();
    if (!query) return data.stockFile.theses;
    return data.stockFile.theses.filter(
      (entry) =>
        entry.thesis.ticker.toLowerCase().includes(query) ||
        entry.thesis.id.toLowerCase().includes(query)
    );
  }, [data.stockFile.theses, stockQuery]);

  const detailSnapshots = useMemo((): SnapshotMenuItem[] => {
    if (!section) return [];
    switch (section) {
      case "train-ai":
        // Mechanics brief is PlainCopyRow only — Playbook is its own section.
        return [];
      case "playbook":
        return data.playbook.snapshotItems;
      case "stock-file":
        return selectedStock?.snapshotItems.filter((item) => item.id !== "mechanics") ?? [];
      case "scouting":
        return data.scouting.snapshotItems;
      default:
        return [];
    }
  }, [data, section, selectedStock]);

  function pickSection(id: ControlPanelSectionId) {
    setSection(id);
    if (id === "stock-file") {
      setStep("stock-pick");
      return;
    }
    setStep("detail");
  }

  function handleBack() {
    if (step === "update") {
      setStep("pick");
      return;
    }
    if (step === "detail" && section === "stock-file") {
      setStep("stock-pick");
      setStockThesisId(null);
      return;
    }
    if (step === "stock-pick" || step === "detail") {
      setStep("pick");
      setSection(null);
      setStockThesisId(null);
      setStockQuery("");
      return;
    }
    closePanel();
  }

  if (!open) return null;

  const detailTitle =
    step === "update"
      ? "Update"
      : step === "stock-pick"
        ? "Pick a stock file"
        : section === "stock-file" && selectedStock
          ? `${selectedStock.thesis.ticker} · ${selectedStock.thesis.id}`
          : sectionMeta?.label ?? "Control panel";

  const detailHint =
    step === "update"
      ? "Paste AI Block — Validate, then Accept"
      : step === "stock-pick"
        ? `${data.activeThesisCount} active — pick one`
        : sectionMeta?.hint ?? "Copy snapshot for your AI";

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-end justify-center bg-black/50 p-4 pb-24 sm:items-center sm:pb-4 lg:pb-4"
      role="dialog"
      aria-modal="true"
      aria-label="Control panel"
      onClick={closePanel}
    >
      <div
        className="flex max-h-[min(520px,88vh)] w-full max-w-lg flex-col rounded-2xl border border-zinc-700/80 bg-zinc-950 p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mb-3 shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">
            Control
          </p>
          <h2 className="text-base font-bold text-zinc-50">{detailTitle}</h2>
          <p className="mt-1 text-[11px] text-zinc-500">
            {step === "pick"
              ? "Update writes. Mechanics / Playbook / Stock file / Scout desk = copy context. Forensic lives on the trade."
              : detailHint}
          </p>
        </header>

        {step === "pick" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <button
              type="button"
              onClick={() => setStep("update")}
              className="flex w-full shrink-0 items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-600/15 px-4 py-3 text-left transition hover:border-emerald-500/60 hover:bg-emerald-600/25"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600/25 text-sm font-bold text-emerald-200">
                ↑
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-emerald-100">Update</span>
                <span className="mt-0.5 block text-xs text-emerald-200/70">
                  Paste AI Block → Validate → Accept
                </span>
              </span>
            </button>
            <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain">
              {SECTIONS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => pickSection(entry.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 text-left transition hover:border-violet-500/30 hover:bg-zinc-900"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-bold uppercase text-violet-300">
                    {entry.label.slice(0, 2)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-zinc-100">{entry.label}</span>
                    <span className="mt-0.5 block text-xs text-zinc-500">{entry.hint}</span>
                  </span>
                </button>
              ))}
            </nav>
          </div>
        ) : null}

        {step === "update" ? <ControlPanelUpdate onBack={handleBack} /> : null}

        {step === "stock-pick" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <input
              type="search"
              value={stockQuery}
              onChange={(event) => setStockQuery(event.target.value)}
              placeholder="Search ticker or profile id"
              className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
            />
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain">
              {filteredStocks.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
                  No active stock files match.
                </p>
              ) : (
                filteredStocks.map((entry) => (
                  <button
                    key={entry.thesis.id}
                    type="button"
                    onClick={() => {
                      setStockThesisId(entry.thesis.id);
                      setStep("detail");
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 text-left transition hover:border-violet-500/30 hover:bg-zinc-900"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600/15 text-sm font-bold text-emerald-300">
                      {entry.thesis.ticker.slice(0, 2)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-zinc-100">
                        {entry.thesis.ticker}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-zinc-500">
                        {entry.thesis.id} · {entry.thesis.status}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}

        {step === "detail" ? (
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain">
            {section === "train-ai" ? (
              <PlainCopyRow
                label="Matrix Mechanics brief"
                description="Stable primer — paste once at the start of the AI chat"
                text={data.trainAi.mechanicsBrief}
              />
            ) : null}
            {detailSnapshots.map((item) => (
              <SnapshotCopyRow key={item.id} item={item} />
            ))}
            {section === "stock-file" && selectedStock
              ? (() => {
                  const mechanics = selectedStock.snapshotItems.find((item) => item.id === "mechanics");
                  return mechanics ? <SnapshotCopyRow key={mechanics.id} item={mechanics} /> : null;
                })()
              : null}
          </div>
        ) : null}

        {step !== "update" ? (
          <footer className="mt-4 flex gap-3 border-t border-zinc-800 pt-4">
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800"
            >
              {step === "pick" ? "Close" : "Back"}
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
