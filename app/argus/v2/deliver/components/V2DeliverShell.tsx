"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DELIVER_PACKAGES, deliverPackageLabel } from "@/lib/argus/export/deliver-catalog";
import type { ExportScopeEntityOption } from "@/lib/argus/export/scope-entities";
import type {
  DeliverPackageKind,
  ExportPreviewSummary,
  ExportScopeType,
} from "@/lib/argus/export/types";
import { V2Badge, V2Card } from "@/app/argus/v2/components/v2-ui";

const SCOPE_TYPES: Array<{ id: ExportScopeType; label: string; icon: string }> = [
  { id: "person", label: "Person", icon: "👤" },
  { id: "project", label: "Project", icon: "📁" },
  { id: "organization", label: "Organization", icon: "🏢" },
  { id: "topic", label: "Topic", icon: "🏷" },
  { id: "event", label: "Event", icon: "📅" },
];

const BADGE_TONE: Record<string, string> = {
  blue: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  red: "bg-red-500/15 text-red-300 ring-red-500/30",
  green: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  purple: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  slate: "bg-zinc-700/50 text-zinc-300 ring-zinc-600/40",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function scopeLabel(type: ExportScopeType): string {
  return SCOPE_TYPES.find((entry) => entry.id === type)?.label ?? type;
}

export function V2DeliverShell({
  entityOptions,
  privateConfigured,
  privateUnlocked,
  initialScopeType,
  initialScopeId,
  initialPackageKind,
}: {
  entityOptions: Record<ExportScopeType, ExportScopeEntityOption[]>;
  privateConfigured: boolean;
  privateUnlocked: boolean;
  initialScopeType?: ExportScopeType;
  initialScopeId?: string;
  initialPackageKind?: DeliverPackageKind;
}) {
  const validInitialPackage =
    initialPackageKind && DELIVER_PACKAGES.some((p) => p.id === initialPackageKind)
      ? initialPackageKind
      : "quick_package";
  const [packageKind, setPackageKind] = useState<DeliverPackageKind>(validInitialPackage);
  const [scopeType, setScopeType] = useState<ExportScopeType>(initialScopeType ?? "person");
  const [scopeId, setScopeId] = useState(initialScopeId ?? "");
  const [entityQuery, setEntityQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [includeLogs, setIncludeLogs] = useState(true);
  const [includeInbox, setIncludeInbox] = useState(true);
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [includePrivate, setIncludePrivate] = useState(false);
  const [preview, setPreview] = useState<ExportPreviewSummary | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [quickMarkdown, setQuickMarkdown] = useState<string | null>(null);

  const scopeEntities = entityOptions[scopeType] ?? [];
  const filteredEntities = useMemo(() => {
    const q = entityQuery.trim().toLowerCase();
    if (!q) return scopeEntities;
    return scopeEntities.filter(
      (entity) =>
        entity.name.toLowerCase().includes(q) ||
        (entity.subtitle?.toLowerCase().includes(q) ?? false)
    );
  }, [entityQuery, scopeEntities]);

  const selectedEntity = scopeEntities.find((entity) => entity.id === scopeId);

  useEffect(() => {
    if (initialScopeId) return;
    if (!scopeId && scopeEntities[0]) setScopeId(scopeEntities[0].id);
  }, [scopeType, scopeEntities, scopeId, initialScopeId]);

  useEffect(() => {
    if (initialScopeType) setScopeType(initialScopeType);
    if (initialScopeId) setScopeId(initialScopeId);
  }, [initialScopeType, initialScopeId]);

  const refreshPreview = useCallback(async () => {
    if (!scopeId) {
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const params = new URLSearchParams({
        scopeType,
        scopeId,
        includePrivate: includePrivate ? "1" : "0",
        includeLogs: includeLogs ? "1" : "0",
        includeInbox: includeInbox ? "1" : "0",
        includeAttachments: includeAttachments ? "1" : "0",
      });
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      const response = await fetch(`/api/argus/export/preview?${params.toString()}`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Preview failed");
      }
      setPreview((await response.json()) as ExportPreviewSummary);
    } catch (error) {
      setPreview(null);
      setPreviewError(error instanceof Error ? error.message : "Preview failed");
    } finally {
      setPreviewLoading(false);
    }
  }, [scopeType, scopeId, includePrivate, includeLogs, includeInbox, includeAttachments, fromDate, toDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshPreview(), 300);
    return () => window.clearTimeout(timer);
  }, [refreshPreview]);

  const refreshQuickPreview = useCallback(async () => {
    if (!scopeId || packageKind !== "quick_package") {
      setQuickMarkdown(null);
      return;
    }
    try {
      const params = new URLSearchParams({
        scopeType,
        scopeId,
        includePrivate: includePrivate ? "1" : "0",
        includeLogs: includeLogs ? "1" : "0",
        includeInbox: includeInbox ? "1" : "0",
        includeAttachments: includeAttachments ? "1" : "0",
      });
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      const response = await fetch(`/api/argus/deliver/quick?${params.toString()}`);
      if (!response.ok) {
        setQuickMarkdown(null);
        return;
      }
      const payload = (await response.json()) as { markdown?: string };
      setQuickMarkdown(payload.markdown ?? null);
    } catch {
      setQuickMarkdown(null);
    }
  }, [
    packageKind,
    scopeType,
    scopeId,
    includePrivate,
    includeLogs,
    includeInbox,
    includeAttachments,
    fromDate,
    toDate,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshQuickPreview(), 400);
    return () => window.clearTimeout(timer);
  }, [refreshQuickPreview]);

  const packageAvailable = DELIVER_PACKAGES.find((pkg) => pkg.id === packageKind)?.available ?? false;
  const canGenerate = packageAvailable && Boolean(scopeId) && !generating;

  async function generatePackage() {
    if (!canGenerate) return;
    if (includePrivate && !privateUnlocked) {
      setStatusMessage("Unlock protected records with your PIN in the top bar first.");
      return;
    }
    setGenerating(true);
    setStatusMessage(null);
    try {
      if (packageKind === "quick_package") {
        const response = await fetch("/api/argus/deliver/quick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scopeType,
            scopeId,
            includePrivate,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
            includeLogs,
            includeInbox,
            includeAttachments,
          }),
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error ?? "Quick package failed");
        }
        const blob = await response.blob();
        const stamp = new Date().toISOString().slice(0, 10);
        const nameToken = (selectedEntity?.name ?? "export").replace(/[^a-zA-Z0-9._-]+/g, "-");
        const anchor = document.createElement("a");
        anchor.href = URL.createObjectURL(blob);
        anchor.download = `argus-quick-${scopeType}-${nameToken}-${stamp}.md`;
        anchor.click();
        URL.revokeObjectURL(anchor.href);
        setStatusMessage("Quick package downloaded.");
        return;
      }

      const response = await fetch("/api/argus/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package: packageKind,
          scopeType,
          scopeId,
          includePrivate,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          includeLogs,
          includeInbox,
          includeAttachments,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Export failed");
      }
      const blob = await response.blob();
      const stamp = new Date().toISOString().slice(0, 10);
      const nameToken = (selectedEntity?.name ?? "export").replace(/[^a-zA-Z0-9._-]+/g, "-");
      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(blob);
      anchor.download = `argus-vault-${scopeType}-${nameToken}-${stamp}.zip`;
      anchor.click();
      URL.revokeObjectURL(anchor.href);
      setStatusMessage("Package generated and downloaded.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Export failed");
    } finally {
      setGenerating(false);
    }
  }

  const includedLabel = [
    includeLogs ? "Logs" : null,
    includeInbox ? "Inbox" : null,
    includeAttachments ? "Attachments" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="v2-page-shell flex h-full min-h-0 flex-col overflow-hidden">
      <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div className="deliver-export-shell mx-auto max-w-6xl px-4 py-6 lg:px-8">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Deliver / Export Center</h1>
            <V2Badge tone="blue">BETA</V2Badge>
          </div>
          <p className="max-w-2xl text-sm text-zinc-400">
            Turn your ARGUS data into evidence packages for different purposes.
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500">
            <span>✓ Evidence-based</span>
            <span>✓ Traceable</span>
            <span>✓ Private by default</span>
            <span>✓ You control what is shared</span>
          </div>
        </div>
        <button
          type="button"
          disabled
          title="Export history coming soon"
          className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-500"
        >
          Export History
        </button>
      </header>

      <section className="mb-8">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">Choose package type</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {DELIVER_PACKAGES.map((pkg) => {
            const selected = packageKind === pkg.id;
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setPackageKind(pkg.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  selected
                    ? "border-violet-500/60 bg-violet-500/10 ring-1 ring-violet-500/30"
                    : "border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700"
                } ${!pkg.available ? "opacity-80" : ""}`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-zinc-100">{pkg.title}</span>
                  {selected ? <span className="text-violet-400">✓</span> : null}
                </div>
                <p className="mb-3 text-[11px] leading-relaxed text-zinc-500">{pkg.description}</p>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${BADGE_TONE[pkg.badgeTone]}`}>
                  {pkg.available ? pkg.badge : "Coming soon"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <V2Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-100">Define scope</h2>

          <div className="mb-5 flex flex-wrap gap-2">
            {SCOPE_TYPES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  setScopeType(entry.id);
                  setScopeId("");
                  setEntityQuery("");
                }}
                className={`rounded-xl px-3 py-2 text-sm ${
                  scopeType === entry.id
                    ? "bg-violet-600 text-white"
                    : "border border-zinc-700 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                {entry.icon} {entry.label}
              </button>
            ))}
          </div>

          <label className="mb-4 block text-xs text-zinc-500">
            Select {scopeLabel(scopeType).toLowerCase()}
            <input
              type="search"
              value={entityQuery}
              onChange={(event) => setEntityQuery(event.target.value)}
              placeholder={`Search ${scopeLabel(scopeType).toLowerCase()}…`}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200"
            />
          </label>

          <select
            value={scopeId}
            onChange={(event) => setScopeId(event.target.value)}
            className="mb-5 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200"
          >
            <option value="">Select entity…</option>
            {filteredEntities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
                {entity.subtitle ? ` — ${entity.subtitle}` : ""}
              </option>
            ))}
          </select>

          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-zinc-500">
              Start date
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200"
              />
            </label>
            <label className="block text-xs text-zinc-500">
              End date
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200"
              />
            </label>
          </div>

          <div className="mb-5 space-y-2">
            <p className="text-xs font-medium text-zinc-500">Include</p>
            {[
              { id: "logs", label: "Journal / Logs", checked: includeLogs, set: setIncludeLogs },
              { id: "inbox", label: "Inbox / Emails", checked: includeInbox, set: setIncludeInbox },
              { id: "files", label: "Attachments / Files", checked: includeAttachments, set: setIncludeAttachments },
            ].map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(event) => item.set(event.target.checked)}
                  className="rounded border-zinc-600"
                />
                {item.label}
              </label>
            ))}
          </div>

          <label className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3">
            <span className="text-sm text-zinc-300">
              🔒 Include private records (PIN required)
            </span>
            <input
              type="checkbox"
              checked={includePrivate}
              disabled={!privateConfigured}
              onChange={(event) => setIncludePrivate(event.target.checked)}
              className="rounded border-zinc-600"
            />
          </label>
          {!privateConfigured ? (
            <p className="mt-2 text-[11px] text-zinc-600">Set ARGUS_PRIVATE_PIN to enable private export.</p>
          ) : includePrivate && !privateUnlocked ? (
            <p className="mt-2 text-[11px] text-amber-400/90">Unlock protected records from the top bar before generating.</p>
          ) : null}
        </V2Card>

        <V2Card className="flex h-fit flex-col p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Package summary</h2>
            <button
              type="button"
              onClick={() => void refreshPreview()}
              className="text-xs text-violet-400 hover:text-violet-300"
            >
              ↻ Refresh
            </button>
          </div>

          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">Package type</dt>
              <dd className="text-right text-zinc-200">{deliverPackageLabel(packageKind)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">Scope</dt>
              <dd className="text-right text-zinc-200">
                {selectedEntity ? `${scopeLabel(scopeType)}: ${selectedEntity.name}` : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">Date range</dt>
              <dd className="text-right text-zinc-200">{preview?.dateLabel ?? (fromDate || toDate ? "Custom" : "All dates")}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">Included</dt>
              <dd className="text-right text-zinc-200">{includedLabel || "—"}</dd>
            </div>
          </dl>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-center">
              <p className="text-2xl font-bold tabular-nums text-zinc-50">
                {previewLoading ? "…" : (preview?.evidenceCount ?? "—")}
              </p>
              <p className="text-[10px] text-zinc-500">Evidence items</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-center">
              <p className="text-2xl font-bold tabular-nums text-zinc-50">
                {previewLoading ? "…" : (preview?.fileCount ?? "—")}
              </p>
              <p className="text-[10px] text-zinc-500">
                Files {preview?.estimatedBytes ? `(${formatBytes(preview.estimatedBytes)})` : ""}
              </p>
            </div>
          </div>

          {previewError ? <p className="mt-3 text-xs text-red-400">{previewError}</p> : null}
          {preview?.containsPrivate && !includePrivate ? (
            <p className="mt-3 text-xs text-amber-400/90">Scope contains private records not included unless toggled on.</p>
          ) : null}
          {!packageAvailable ? (
            <p className="mt-3 text-xs text-zinc-500">This package type is not available yet. Use Evidence Vault.</p>
          ) : null}
        </V2Card>
      </div>

      {packageKind === "quick_package" && quickMarkdown ? (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-zinc-100">Preview</h2>
          <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 font-mono text-[11px] leading-relaxed text-zinc-400">
            {quickMarkdown.slice(0, 4000)}
            {quickMarkdown.length > 4000 ? "\n\n… (truncated in preview)" : ""}
          </pre>
        </section>
      ) : null}

      <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800/80 pt-6">
        <div className="text-xs text-zinc-500">
          <p>Your data stays private. Only you can generate and access these packages.</p>
          <p className="mt-1">
            {packageKind === "quick_package"
              ? "Output format: Markdown summary (.md) — fast handover, no file bundling."
              : "Output format: ZIP package with JSON manifest (v1)."}
          </p>
          {statusMessage ? <p className="mt-2 text-zinc-400">{statusMessage}</p> : null}
        </div>
        <button
          type="button"
          disabled={!canGenerate}
          onClick={() => void generatePackage()}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {generating
            ? "Generating…"
            : packageKind === "quick_package"
              ? "⬇ Download Quick Package"
              : "⬇ Generate Package"}
        </button>
      </footer>
        </div>
      </div>
    </div>
  );
}
