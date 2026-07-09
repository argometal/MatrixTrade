"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExportScopeType, QuickDeliverSummary } from "@/lib/argus/export/types";

type QuickDeliverResponse = {
  markdown: string;
  summary: QuickDeliverSummary;
};

export function V2QuickDeliverButton({
  scopeType,
  scopeId,
  scopeName,
  label = "Quick package",
  className,
}: {
  scopeType: ExportScopeType;
  scopeId: string;
  scopeName: string;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "rounded-lg border border-emerald-500/40 bg-emerald-600/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/25"
        }
      >
        {label}
      </button>
      <V2QuickDeliverModal
        open={open}
        scopeType={scopeType}
        scopeId={scopeId}
        scopeName={scopeName}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export function V2QuickDeliverModal({
  open,
  scopeType,
  scopeId,
  scopeName,
  onClose,
}: {
  open: boolean;
  scopeType: ExportScopeType;
  scopeId: string;
  scopeName: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<QuickDeliverResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ scopeType, scopeId, includePrivate: "0" });
      const response = await fetch(`/api/argus/deliver/quick?${params.toString()}`);
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to load quick package");
      }
      setPayload((await response.json()) as QuickDeliverResponse);
    } catch (err) {
      setPayload(null);
      setError(err instanceof Error ? err.message : "Failed to load quick package");
    } finally {
      setLoading(false);
    }
  }, [scopeType, scopeId]);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    setStatusMessage(null);
    void loadPreview();
  }, [open, loadPreview]);

  async function copyMarkdown() {
    if (!payload?.markdown) return;
    try {
      await navigator.clipboard.writeText(payload.markdown);
      setCopied(true);
      setStatusMessage("Copied to clipboard.");
    } catch {
      setStatusMessage("Copy failed — try Download .md instead.");
    }
  }

  function downloadMarkdown() {
    if (!payload?.markdown) return;
    const stamp = payload.summary.generatedAt.slice(0, 10);
    const token = scopeName.replace(/[^a-zA-Z0-9._-]+/g, "-");
    const blob = new Blob([payload.markdown], { type: "text/markdown;charset=utf-8" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `argus-quick-${scopeType}-${token}-${stamp}.md`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    setStatusMessage("Markdown downloaded.");
  }

  async function downloadZip() {
    setDownloadingZip(true);
    setStatusMessage(null);
    try {
      const response = await fetch("/api/argus/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package: "evidence_vault",
          scopeType,
          scopeId,
          includePrivate: false,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "ZIP export failed");
      }
      const blob = await response.blob();
      const stamp = new Date().toISOString().slice(0, 10);
      const token = scopeName.replace(/[^a-zA-Z0-9._-]+/g, "-");
      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(blob);
      anchor.download = `argus-vault-${scopeType}-${token}-${stamp}.zip`;
      anchor.click();
      URL.revokeObjectURL(anchor.href);
      setStatusMessage("Full ZIP downloaded.");
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "ZIP export failed");
    } finally {
      setDownloadingZip(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(720px,90vh)] w-full max-w-3xl flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-800 px-5 py-4">
          <h3 className="text-[15px] font-semibold text-zinc-100">Quick Package — {scopeName}</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Human-readable handover summary · timeline, evidence index, file metadata (no bundling).
          </p>
        </div>

        {payload?.summary ? (
          <div className="grid grid-cols-4 gap-2 border-b border-zinc-800/80 px-5 py-3">
            {[
              { label: "Evidence", value: payload.summary.evidenceCount },
              { label: "Emails", value: payload.summary.inboxCount },
              { label: "Journal", value: payload.summary.logCount },
              { label: "Files", value: payload.summary.fileCount },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg bg-zinc-950/60 px-2 py-2 text-center">
                <p className="text-lg font-bold tabular-nums text-zinc-100">{stat.value}</p>
                <p className="text-[10px] text-zinc-500">{stat.label}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="py-12 text-center text-sm text-zinc-500">Building quick package…</p>
          ) : error ? (
            <p className="py-12 text-center text-sm text-red-400">{error}</p>
          ) : payload?.markdown ? (
            <pre className="whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 font-mono text-[11px] leading-relaxed text-zinc-300">
              {payload.markdown}
            </pre>
          ) : null}
        </div>

        {statusMessage ? (
          <p className="px-5 pb-2 text-xs text-zinc-400">{statusMessage}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800 p-4">
          <button
            type="button"
            disabled={!payload?.markdown || loading}
            onClick={() => void copyMarkdown()}
            className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
          <button
            type="button"
            disabled={!payload?.markdown || loading}
            onClick={downloadMarkdown}
            className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
          >
            Download .md
          </button>
          <button
            type="button"
            disabled={downloadingZip || loading}
            onClick={() => void downloadZip()}
            className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-40"
          >
            {downloadingZip ? "Generating ZIP…" : "Full ZIP"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
