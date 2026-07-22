"use client";

import { useEffect, useMemo, useState } from "react";
import { copyText } from "@/app/components/ai-bridge/copy-text";
import { ControlPanelUpdate } from "@/app/components/control-panel/ControlPanelUpdate";
import { useControlPanel } from "@/app/components/control-panel/MatrixControlPanelProvider";
import type { ControlPanelSectionId } from "@/lib/control-panel-types";
import type { SnapshotMenuItem } from "@/lib/snapshot-types";

/** Local step machine — "apply" is user-facing; internal ControlPanelUpdate unchanged. */
type Step = "pick" | "apply" | "stock-pick" | "detail";

/** Primary Control actions — Stock Files stay direct-access (not under Library). */
const PRIMARY: {
  id: "train-ai" | "stock-file" | "apply";
  label: string;
  hint: string;
}[] = [
  {
    id: "train-ai",
    label: "Matrix Mechanics",
    hint: "Constitution — copy once for a new AI chat",
  },
  {
    id: "stock-file",
    label: "Stock Files",
    hint: "One ticker — MTAE request, profile, linked scouts",
  },
  {
    id: "apply",
    label: "Apply",
    hint: "Paste AI Block → Validate → Accept",
  },
];

/** Library catalog — reusable context only (no Stock Files). */
const LIBRARY: {
  id: Exclude<ControlPanelSectionId, "train-ai" | "stock-file">;
  label: string;
  hint: string;
}[] = [
  {
    id: "mtae",
    label: "Technical Analysis",
    hint: "MTAE protocol + TF role maps (no capital)",
  },
  {
    id: "playbook",
    label: "Playbook",
    hint: "Method rules, checklists, and stats",
  },
  {
    id: "scouting",
    label: "Scout Desk",
    hint: "Active cases and monthly risk room",
  },
  {
    id: "learning",
    label: "Learning",
    hint: "MAF attribution protocol (existing)",
  },
];

function SnapshotCopyRow({ item }: { item: SnapshotMenuItem }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyText(item.text);
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

function NavRow({
  label,
  hint,
  accent,
  onClick,
}: {
  label: string;
  hint: string;
  accent?: "emerald" | "violet";
  onClick: () => void;
}) {
  const emerald = accent === "emerald";
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        emerald
          ? "flex w-full items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-600/15 px-4 py-3 text-left transition hover:border-emerald-500/60 hover:bg-emerald-600/25"
          : "flex w-full items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 text-left transition hover:border-violet-500/30 hover:bg-zinc-900"
      }
    >
      <span
        className={
          emerald
            ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600/25 text-sm font-bold text-emerald-200"
            : "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-bold uppercase text-violet-300"
        }
      >
        {emerald ? "↑" : label.slice(0, 2)}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={
            emerald
              ? "block text-sm font-semibold text-emerald-100"
              : "block text-sm font-semibold text-zinc-100"
          }
        >
          {label}
        </span>
        <span
          className={
            emerald
              ? "mt-0.5 block text-xs text-emerald-200/70"
              : "mt-0.5 block text-xs text-zinc-500"
          }
        >
          {hint}
        </span>
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

  const allMeta = [...PRIMARY.filter((p) => p.id !== "apply"), ...LIBRARY];
  const sectionMeta = allMeta.find((entry) => entry.id === section);

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

  /** Control filters duplicate Mechanics rows — builders may still include them for other surfaces. */
  const detailSnapshots = useMemo((): SnapshotMenuItem[] => {
    if (!section) return [];
    switch (section) {
      case "train-ai":
        return [];
      case "mtae":
        return data.mtae.snapshotItems.filter((item) => item.id !== "mtae-protocol");
      case "playbook":
        return data.playbook.snapshotItems.filter((item) => item.id !== "mechanics");
      case "stock-file":
        return selectedStock?.snapshotItems.filter((item) => item.id !== "mechanics") ?? [];
      case "scouting":
        return data.scouting.snapshotItems;
      case "learning":
        return data.learning.snapshotItems;
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

  function handlePrimary(id: (typeof PRIMARY)[number]["id"]) {
    if (id === "apply") {
      setStep("apply");
      setSection(null);
      return;
    }
    pickSection(id);
  }

  function handleBack() {
    if (step === "apply") {
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
    step === "apply"
      ? "Apply"
      : step === "stock-pick"
        ? "Pick a Stock File"
        : section === "stock-file" && selectedStock
          ? `${selectedStock.thesis.ticker} · ${selectedStock.thesis.id}`
          : sectionMeta?.label ?? "Control";

  const detailHint =
    step === "apply"
      ? "Paste AI Block — Validate, then Accept"
      : step === "stock-pick"
        ? `${data.activeThesisCount} active — pick one`
        : sectionMeta?.hint ?? "Copy context for your AI";

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-end justify-center bg-black/50 p-4 pb-24 sm:items-center sm:pb-4 lg:pb-4"
      role="dialog"
      aria-modal="true"
      aria-label="Control panel"
      onClick={closePanel}
    >
      <div
        className="flex max-h-[min(560px,90vh)] w-full max-w-lg flex-col rounded-2xl border border-zinc-700/80 bg-zinc-950 p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mb-3 shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">
            Control
          </p>
          <h2 className="text-base font-bold text-zinc-50">{detailTitle}</h2>
          <p className="mt-1 text-[11px] text-zinc-500">
            {step === "pick"
              ? "Mechanics once per chat → task in natural language → copy only the block AI asks for → Apply."
              : detailHint}
          </p>
        </header>

        {step === "pick" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain">
            <nav className="space-y-2">
              {PRIMARY.map((entry) => (
                <NavRow
                  key={entry.id}
                  label={entry.label}
                  hint={entry.hint}
                  accent={entry.id === "apply" ? "emerald" : "violet"}
                  onClick={() => handlePrimary(entry.id)}
                />
              ))}
            </nav>
            <div className="pt-1">
              <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                Library
              </p>
              <nav className="space-y-2">
                {LIBRARY.map((entry) => (
                  <NavRow
                    key={entry.id}
                    label={entry.label}
                    hint={entry.hint}
                    onClick={() => pickSection(entry.id)}
                  />
                ))}
              </nav>
            </div>
          </div>
        ) : null}

        {step === "apply" ? <ControlPanelUpdate onBack={handleBack} /> : null}

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
                  No active Stock Files match.
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
                label="Matrix Mechanics"
                description="Stable constitution — paste once at the start of the AI chat"
                text={data.trainAi.mechanicsBrief}
              />
            ) : null}
            {section === "mtae" ? (
              <PlainCopyRow
                label="MTAE protocol"
                description="Technical procedure — not Mechanics, not Playbook, not Scout"
                text={data.mtae.protocolBrief}
              />
            ) : null}
            {section === "learning" && data.learning.mafProtocolBrief ? (
              <PlainCopyRow
                label="MAF attribution protocol"
                description="Component attribution — not a journal; never invent prices"
                text={data.learning.mafProtocolBrief}
              />
            ) : null}
            {detailSnapshots.map((item) => (
              <SnapshotCopyRow key={item.id} item={item} />
            ))}
            {detailSnapshots.length === 0 &&
            section !== "train-ai" &&
            section !== "mtae" &&
            section !== "learning" ? (
              <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
                No copy items for this section.
              </p>
            ) : null}
          </div>
        ) : null}

        {step !== "apply" ? (
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
