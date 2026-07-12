"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { copyText } from "@/app/components/ai-bridge/copy-text";
import { useMatrixConnect } from "@/app/components/matrix-connect/MatrixConnectProvider";
import { useControlPanel } from "@/app/components/control-panel/MatrixControlPanelProvider";
import type { ConnectFlowOpenOptions } from "@/lib/matrix-connect-types";
import type { SnapshotMenuItem } from "@/lib/snapshot-types";

type SectionId = "train-ai" | "playbook" | "stock-file" | "scouting" | "trade" | "history";

const SECTION_META: {
  id: SectionId;
  label: string;
  hint: string;
}[] = [
  { id: "train-ai", label: "Train AI", hint: "Mechanics brief, playbook context, paste response" },
  { id: "playbook", label: "Playbook", hint: "Strategies, snapshots, open playbook" },
  { id: "stock-file", label: "Stock File", hint: "Active theses and per-ticker snapshots" },
  { id: "scouting", label: "Scouting", hint: "Scout desk, plans, ticker snapshots" },
  { id: "trade", label: "Trade", hint: "New trade, trades snapshot, open-trade paste" },
  { id: "history", label: "History", hint: "Inbox proposals and pending count" },
];

function ControlPanelSection({
  id,
  label,
  hint,
  expanded,
  onToggle,
  children,
}: {
  id: SectionId;
  label: string;
  hint: string;
  expanded: boolean;
  onToggle: (id: SectionId) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40">
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={expanded}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-zinc-900/70"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-zinc-100">{label}</span>
          <span className="mt-0.5 block text-xs text-zinc-500">{hint}</span>
        </span>
        <span className="shrink-0 pt-0.5 text-xs text-zinc-500">{expanded ? "▴" : "▾"}</span>
      </button>
      {expanded ? <div className="space-y-2 border-t border-zinc-800 px-4 py-3">{children}</div> : null}
    </section>
  );
}

function SnapshotCopyButton({
  item,
  onCopied,
}: {
  item: SnapshotMenuItem;
  onCopied?: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyText(item.text);
    if (!ok) return;
    setCopied(true);
    onCopied?.(item.id);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="flex w-full items-start justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-left hover:border-violet-500/40 hover:bg-violet-950/20"
    >
      <span className="min-w-0">
        <span className="block text-xs font-medium text-zinc-100">{item.label}</span>
        <span className="mt-0.5 block text-[11px] text-zinc-500">{item.description}</span>
      </span>
      <span className="shrink-0 text-[11px] font-medium text-violet-300">
        {copied ? "Copied ✓" : "Copy"}
      </span>
    </button>
  );
}

function PlainCopyButton({
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
      className="flex w-full items-start justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-left hover:border-violet-500/40 hover:bg-violet-950/20"
    >
      <span className="min-w-0">
        <span className="block text-xs font-medium text-zinc-100">{label}</span>
        <span className="mt-0.5 block text-[11px] text-zinc-500">{description}</span>
      </span>
      <span className="shrink-0 text-[11px] font-medium text-violet-300">
        {copied ? "Copied ✓" : "Copy"}
      </span>
    </button>
  );
}

function PasteConnectButton({
  label,
  connectOptions,
}: {
  label: string;
  connectOptions: ConnectFlowOpenOptions;
}) {
  const { openConnect } = useMatrixConnect();

  return (
    <button
      type="button"
      onClick={() => openConnect(connectOptions)}
      className="w-full rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2.5 text-left text-xs font-semibold text-emerald-200 hover:bg-emerald-950/50"
    >
      {label}
    </button>
  );
}

function PanelLink({
  href,
  label,
  badge,
}: {
  href: string;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-xs font-medium text-violet-300 hover:border-violet-500/40 hover:bg-violet-950/20"
    >
      <span>{label}</span>
      {badge && badge > 0 ? (
        <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-medium text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

export function MatrixControlPanel() {
  const { open, closePanel, data } = useControlPanel();
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState<SectionId | null>("train-ai");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function toggleSection(id: SectionId) {
    setExpanded((current) => (current === id ? null : id));
  }

  if (!open || !mounted) return null;

  const content = (
    <div className="fixed inset-0 z-[9998] flex justify-end bg-black/60 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close control panel"
        className="absolute inset-0"
        onClick={closePanel}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Control panel"
        className="relative flex h-full w-full max-w-md flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-50">Control panel</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Train AI, snapshots, scouting, trades — one place
            </p>
          </div>
          <button
            type="button"
            onClick={closePanel}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200"
          >
            Close
          </button>
        </header>

        <div className="argus-v2-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          <ControlPanelSection
            id="train-ai"
            label={SECTION_META[0]!.label}
            hint={SECTION_META[0]!.hint}
            expanded={expanded === "train-ai"}
            onToggle={toggleSection}
          >
            <PlainCopyButton
              label="Matrix Mechanics brief"
              description="Stable primer — paste once per AI session"
              text={data.trainAi.mechanicsBrief}
            />
            <SnapshotCopyButton item={data.trainAi.mechanicsSnapshot} />
            {data.trainAi.playbookSnapshotItems
              .filter((item) => item.id === "playbook")
              .map((item) => (
                <SnapshotCopyButton key={item.id} item={item} />
              ))}
            <PasteConnectButton
              label="Paste AI response"
              connectOptions={data.trainAi.connectOptions}
            />
          </ControlPanelSection>

          <ControlPanelSection
            id="playbook"
            label={SECTION_META[1]!.label}
            hint={SECTION_META[1]!.hint}
            expanded={expanded === "playbook"}
            onToggle={toggleSection}
          >
            {data.playbooks.length === 0 ? (
              <p className="text-xs text-zinc-500">No playbooks loaded.</p>
            ) : (
              <ul className="space-y-1 text-xs text-zinc-400">
                {data.playbooks.map((playbook) => (
                  <li key={playbook.id}>
                    {playbook.name}{" "}
                    <span className="text-zinc-600">· {playbook.status.toLowerCase()}</span>
                  </li>
                ))}
              </ul>
            )}
            {data.playbook.snapshotItems.map((item) => (
              <SnapshotCopyButton key={item.id} item={item} />
            ))}
            <PanelLink href="/playbook" label="Open Playbook" />
          </ControlPanelSection>

          <ControlPanelSection
            id="stock-file"
            label={SECTION_META[2]!.label}
            hint={SECTION_META[2]!.hint}
            expanded={expanded === "stock-file"}
            onToggle={toggleSection}
          >
            {data.stockFile.theses.length === 0 ? (
              <p className="text-xs text-zinc-500">No active stock files.</p>
            ) : (
              data.stockFile.theses.map((entry) => (
                <div key={entry.thesis.id} className="space-y-2">
                  <p className="text-xs font-medium text-zinc-300">
                    {entry.thesis.ticker} · {entry.thesis.status}
                  </p>
                  {entry.snapshotItems
                    .filter((item) => item.id !== "mechanics")
                    .map((item) => (
                      <SnapshotCopyButton key={`${entry.thesis.id}-${item.id}`} item={item} />
                    ))}
                </div>
              ))
            )}
            <PanelLink href="/stock-theses/new" label="New stock file" />
            <PasteConnectButton
              label="Paste AI response · update file"
              connectOptions={data.stockFile.connectOptions}
            />
          </ControlPanelSection>

          <ControlPanelSection
            id="scouting"
            label={SECTION_META[3]!.label}
            hint={SECTION_META[3]!.hint}
            expanded={expanded === "scouting"}
            onToggle={toggleSection}
          >
            {data.scouting.overviewSnapshotItems
              .filter((item) => item.id === "scout-desk")
              .map((item) => (
                <SnapshotCopyButton key={item.id} item={item} />
              ))}
            {data.scouting.thesisEntries.map((entry) =>
              entry.snapshotItems
                .filter((item) => item.id === "scout-ticker")
                .map((item) => <SnapshotCopyButton key={`${entry.thesis.id}-${item.id}`} item={item} />)
            )}
            {data.scouting.planEntries.map((entry) =>
              entry.snapshotItems
                .filter((item) => item.id === "scout-plan")
                .map((item) => <SnapshotCopyButton key={`${entry.plan.id}-${item.id}`} item={item} />)
            )}
            <PanelLink href="/planning" label="Open Scouting Desk" />
            <PasteConnectButton
              label="Paste AI response · validate scout"
              connectOptions={data.scouting.connectOptions}
            />
          </ControlPanelSection>

          <ControlPanelSection
            id="trade"
            label={SECTION_META[4]!.label}
            hint={SECTION_META[4]!.hint}
            expanded={expanded === "trade"}
            onToggle={toggleSection}
          >
            <PanelLink href="/trades-preview" label="New trade" />
            {data.trade.snapshotItems.map((item) => (
              <SnapshotCopyButton key={item.id} item={item} />
            ))}
            <PasteConnectButton
              label="Paste AI response · open trade"
              connectOptions={data.trade.connectOptions}
            />
          </ControlPanelSection>

          <ControlPanelSection
            id="history"
            label={SECTION_META[5]!.label}
            hint={SECTION_META[5]!.hint}
            expanded={expanded === "history"}
            onToggle={toggleSection}
          >
            <p className="text-xs text-zinc-500">
              {data.pendingInboxCount > 0
                ? `${data.pendingInboxCount} pending proposal${data.pendingInboxCount === 1 ? "" : "s"}`
                : "No pending proposals"}
            </p>
            <PanelLink
              href="/inbox"
              label="Open History"
              badge={data.pendingInboxCount}
            />
          </ControlPanelSection>
        </div>
      </aside>
    </div>
  );

  return createPortal(content, document.body);
}
