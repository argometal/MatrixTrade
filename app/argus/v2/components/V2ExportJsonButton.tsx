"use client";

import { useState } from "react";
import type { ExportScopeType } from "@/lib/argus/export/types";

function safeFileToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "export";
}

/** Download org/project/person scoped JSON (evidence + runbooks) next to PDF/Deliver. */
export function V2ExportJsonButton({
  scopeType,
  scopeId,
  scopeName,
  className,
}: {
  scopeType: ExportScopeType;
  scopeId: string;
  scopeName: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onExport() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/argus/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package: "json_snapshot",
          scopeType,
          scopeId,
          includePrivate: false,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Export failed (${response.status})`);
      }
      const blob = await response.blob();
      const stamp = new Date().toISOString().slice(0, 10);
      const filename =
        response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ??
        `argus-${scopeType}-${safeFileToken(scopeName)}-${stamp}.json`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void onExport()}
        className={
          className ??
          "rounded-lg border border-sky-500/40 bg-sky-600/15 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-600/25 disabled:opacity-50"
        }
      >
        {busy ? "Exporting…" : "Export JSON"}
      </button>
      {error ? <span className="max-w-[12rem] text-[10px] text-rose-300">{error}</span> : null}
    </span>
  );
}
