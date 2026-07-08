"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { ImportAiBlockActionResult } from "@/app/actions";
import { copyText } from "@/app/components/ai-bridge/copy-text";
import {
  buildTradeProposalBlock,
  proposalRMultiple,
  proposalStopPct,
  proposalTargetPct,
  type TradeProposalFields,
} from "@/lib/build-trade-proposal-block";
import { parseAiBlock } from "@/lib/ai-block";
import {
  formatTradeUsd,
  type TradesWorkspaceData,
  type TradesWorkspaceRow,
} from "@/lib/trades-workspace-types";

const QUICK_PROMPTS = [
  "Open a trade",
  "Adjust a trade",
  "Close a trade",
  "Analyze open trades",
  "Review recent losses",
] as const;

const QUICK_ACTIONS = [
  "Adjust open trade",
  "Close a trade",
  "Analyze open trades",
  "Review losses",
  "Create from playbook",
] as const;

type TabId = "new" | "open" | "pending" | "closed" | "all";

function statusLabel(row: TradesWorkspaceRow): string {
  if (row.status === "closed" && !row.reviewed) return "Pending review";
  return row.status.charAt(0).toUpperCase() + row.status.slice(1);
}

export function TradesWorkspace({
  data,
  importAction,
}: {
  data: TradesWorkspaceData;
  importAction: (formData: FormData) => Promise<ImportAiBlockActionResult>;
}) {
  const [tab, setTab] = useState<TabId>("new");
  const [search, setSearch] = useState("");
  const [assistantText, setAssistantText] = useState("");
  const [proposalJson, setProposalJson] = useState("");
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<{ id: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState({
    id: data.suggestedTradeId,
    ticker: "",
    direction: "long" as "long" | "short",
    entry: "",
    stop: "",
    target: "",
    shares: "10",
    playbookId: "",
    notes: "",
  });

  const parsed = useMemo(() => {
    if (!proposalJson.trim()) return null;
    return parseAiBlock(proposalJson);
  }, [proposalJson]);

  const filteredRows = useMemo(() => {
    let rows = data.rows;
    if (tab === "open") rows = rows.filter((r) => r.status === "open");
    else if (tab === "pending") rows = rows.filter((r) => r.status === "pending");
    else if (tab === "closed") rows = rows.filter((r) => r.status === "closed");
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.ticker.toLowerCase().includes(q) ||
          r.playbook.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [data.rows, tab, search]);

  function showProposal(json: string) {
    setProposalJson(json);
    setProposalError(null);
    setImportSuccess(null);
    const result = parseAiBlock(json);
    if (!result.ok) setProposalError(result.error);
  }

  function buildFromForm(): TradeProposalFields | null {
    const entry = parseFloat(form.entry);
    const stop = parseFloat(form.stop);
    const shares = parseInt(form.shares, 10);
    const target = form.target.trim() ? parseFloat(form.target) : undefined;
    if (!form.id.trim() || !form.ticker.trim() || Number.isNaN(entry) || Number.isNaN(stop) || Number.isNaN(shares)) {
      setProposalError("Fill ID, ticker, entry, stop, and shares.");
      return null;
    }
    return {
      id: form.id,
      ticker: form.ticker,
      entry,
      stop,
      shares,
      target,
      thesis: form.notes || undefined,
      playbookId: form.playbookId || undefined,
      direction: form.direction,
    };
  }

  function handleReviewTrade() {
    const fields = buildFromForm();
    if (!fields) return;
    showProposal(buildTradeProposalBlock(fields));
    setTab("new");
  }

  async function handleCopyAssistant() {
    const text = assistantText.trim();
    if (!text) return;
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handlePasteProposal(raw: string) {
    showProposal(raw);
  }

  function handleAcceptProposal() {
    if (!proposalJson.trim()) return;
    setProposalError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("aiBlock", proposalJson);
      const result = await importAction(fd);
      if ("error" in result) {
        setProposalError(
          result.details?.length ? `${result.error}: ${result.details.join("; ")}` : result.error
        );
        return;
      }
      setImportSuccess({ id: result.inboxItemId });
      setProposalJson("");
    });
  }

  const proposalBody =
    parsed?.ok && parsed.body.proposal && typeof parsed.body.proposal === "object"
      ? (parsed.body.proposal as Record<string, unknown>)
      : null;

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">New Trade</h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                Assistant or traditional entry — proposals go to Inbox for approval.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/trades"
                className="hidden rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 sm:inline-block"
              >
                Classic trades →
              </Link>
              <Link
                href="/exchange"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-600"
              >
                Import / Add Trade
              </Link>
              <Link
                href="/trades/new"
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
              >
                + New Trade (classic)
              </Link>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                ["new", "New Trade"],
                ["open", `Open (${data.counts.open})`],
                ["pending", `Pending (${data.counts.pending})`],
                ["closed", `Closed (${data.counts.closed})`],
                ["all", "All Trades"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  tab === id
                    ? "bg-violet-600/20 text-violet-300"
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:p-6 xl:grid-cols-[1.1fr_0.9fr]">
          {/* Trade Assistant */}
          <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 lg:col-span-2 xl:col-span-1">
            <h2 className="text-sm font-semibold text-zinc-200">Trade Assistant</h2>
            <p className="text-xs text-zinc-500">Write naturally — proposal only, nothing written yet.</p>
            <textarea
              value={assistantText}
              onChange={(e) => setAssistantText(e.target.value)}
              rows={3}
              placeholder="Open long Google with stop 335 and target 450…"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
            />
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setAssistantText(label)}
                  className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:border-violet-500/50 hover:text-violet-300"
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={!assistantText.trim()}
              onClick={handleCopyAssistant}
              className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {copied ? "✓ Copied — paste in your assistant" : "Copy for Assistant"}
            </button>
            <label className="block text-xs text-zinc-500">
              Paste AI Block response
              <textarea
                rows={4}
                placeholder='Paste { "type": "trade-proposal", ... } from your assistant'
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-[11px] text-zinc-300 focus:border-violet-500 focus:outline-none"
                onBlur={(e) => {
                  if (e.target.value.trim()) handlePasteProposal(e.target.value);
                }}
              />
            </label>
          </section>

          {/* Traditional Entry */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
            <h2 className="text-sm font-semibold text-zinc-200">Traditional Entry</h2>
            <p className="text-xs text-zinc-500">Manual control — same proposal pipeline.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs">
                <span className="text-zinc-500">Trade ID</span>
                <input
                  value={form.id}
                  onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs">
                <span className="text-zinc-500">Ticker</span>
                <input
                  value={form.ticker}
                  onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value }))}
                  placeholder="AMZN"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs sm:col-span-2">
                <span className="text-zinc-500">Direction</span>
                <div className="mt-1 flex gap-2">
                  {(["long", "short"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, direction: d }))}
                      className={`flex-1 rounded-lg border py-1.5 text-xs capitalize ${
                        form.direction === d
                          ? "border-violet-500 bg-violet-600/20 text-violet-300"
                          : "border-zinc-700 text-zinc-500"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </label>
              <label className="block text-xs">
                <span className="text-zinc-500">Entry</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.entry}
                  onChange={(e) => setForm((f) => ({ ...f, entry: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs">
                <span className="text-zinc-500">Stop</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.stop}
                  onChange={(e) => setForm((f) => ({ ...f, stop: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs">
                <span className="text-zinc-500">Target</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.target}
                  onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs">
                <span className="text-zinc-500">Shares</span>
                <input
                  type="number"
                  value={form.shares}
                  onChange={(e) => setForm((f) => ({ ...f, shares: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs sm:col-span-2">
                <span className="text-zinc-500">Playbook</span>
                <select
                  value={form.playbookId}
                  onChange={(e) => setForm((f) => ({ ...f, playbookId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
                >
                  <option value="">— Optional —</option>
                  {data.playbooks.map((pb) => (
                    <option key={pb.id} value={pb.id}>
                      {pb.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs sm:col-span-2">
                <span className="text-zinc-500">Notes / thesis</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
                />
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setForm({
                    id: data.suggestedTradeId,
                    ticker: "",
                    direction: "long",
                    entry: "",
                    stop: "",
                    target: "",
                    shares: "10",
                    playbookId: "",
                    notes: "",
                  })
                }
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleReviewTrade}
                className="flex-1 rounded-lg border border-violet-500/50 py-2 text-sm font-medium text-violet-300 hover:bg-violet-600/10"
              >
                Review Trade →
              </button>
            </div>
          </section>

          {/* Assistant Proposal */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 lg:col-span-2">
            <h2 className="text-sm font-semibold text-zinc-200">Assistant Proposal</h2>
            <p className="text-xs text-zinc-500">Exactly one action — Accept sends to Inbox, not Supabase.</p>

            {importSuccess && (
              <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
                Sent to Inbox ·{" "}
                <Link href={`/inbox/${importSuccess.id}`} className="font-medium underline">
                  Review proposal →
                </Link>
              </div>
            )}

            {proposalError && (
              <p className="mt-3 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-300">
                {proposalError}
              </p>
            )}

            {!proposalJson.trim() ? (
              <div className="mt-4 rounded-xl border border-dashed border-zinc-700 px-4 py-10 text-center text-sm text-zinc-500">
                Proposal will appear here after Review Trade or pasting an AI Block.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {proposalBody && (
                  <div className="rounded-xl border border-violet-500/20 bg-violet-950/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-violet-400">AI Proposal</p>
                    <p className="mt-2 text-lg font-semibold">
                      {String(proposalBody.ticker ?? "—")}{" "}
                      <span className="text-sm font-normal text-zinc-400">
                        {String(proposalBody.id ?? "")}
                      </span>
                    </p>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                      <div>
                        <dt className="text-xs text-zinc-500">Entry</dt>
                        <dd>${Number(proposalBody.entry ?? 0).toFixed(2)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-zinc-500">Stop</dt>
                        <dd>
                          ${Number(proposalBody.stop ?? 0).toFixed(2)}{" "}
                          <span className="text-zinc-500">
                            {typeof proposalBody.entry === "number" &&
                            typeof proposalBody.stop === "number"
                              ? proposalStopPct(proposalBody.entry, proposalBody.stop)
                              : ""}
                          </span>
                        </dd>
                      </div>
                      {proposalBody.target !== undefined && (
                        <div>
                          <dt className="text-xs text-zinc-500">Target</dt>
                          <dd>
                            ${Number(proposalBody.target).toFixed(2)}{" "}
                            <span className="text-emerald-400">
                              {typeof proposalBody.entry === "number"
                                ? proposalTargetPct(
                                    proposalBody.entry,
                                    Number(proposalBody.target)
                                  )
                                : ""}
                            </span>
                          </dd>
                        </div>
                      )}
                      <div>
                        <dt className="text-xs text-zinc-500">R multiple</dt>
                        <dd>
                          {typeof proposalBody.entry === "number" &&
                          typeof proposalBody.stop === "number" &&
                          proposalBody.target !== undefined
                            ? proposalRMultiple(
                                proposalBody.entry,
                                proposalBody.stop,
                                Number(proposalBody.target)
                              )
                            : "—"}
                        </dd>
                      </div>
                    </dl>
                    {typeof proposalBody.thesis === "string" && (
                      <p className="mt-3 text-sm text-zinc-400">{proposalBody.thesis}</p>
                    )}
                  </div>
                )}
                <textarea
                  value={proposalJson}
                  onChange={(e) => showProposal(e.target.value)}
                  rows={8}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-[11px] text-zinc-400"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setProposalJson("")}
                    className="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-400"
                  >
                    Regenerate
                  </button>
                  <button
                    type="button"
                    disabled={pending || !parsed?.ok}
                    onClick={handleAcceptProposal}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                  >
                    {pending ? "Sending…" : "Accept Proposal → Inbox"}
                  </button>
                </div>
                <p className="text-xs text-zinc-600">
                  AI proposes. You decide. Nothing is applied until Inbox → Apply.
                </p>
              </div>
            )}
          </section>

          {/* My Trades table */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-zinc-200">My Trades</h2>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ticker, ID, playbook…"
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300"
              />
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs uppercase text-zinc-500">
                    <th className="pb-2 pr-3">Ticker</th>
                    <th className="pb-2 pr-3">Type</th>
                    <th className="pb-2 pr-3">Playbook</th>
                    <th className="pb-2 pr-3">Entry</th>
                    <th className="pb-2 pr-3">Stop</th>
                    <th className="pb-2 pr-3">R</th>
                    <th className="pb-2 pr-3">P/L</th>
                    <th className="pb-2 pr-3">Status</th>
                    <th className="pb-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-zinc-500">
                        No trades match this view.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={row.id} className="hover:bg-zinc-900/50">
                        <td className="py-2.5 pr-3">
                          <Link
                            href={`/trades/${row.id}`}
                            className="font-medium text-violet-300 hover:underline"
                          >
                            {row.ticker}
                          </Link>
                          <span className="ml-1 text-xs text-zinc-600">{row.id}</span>
                        </td>
                        <td className="py-2.5 pr-3 capitalize text-zinc-400">{row.direction}</td>
                        <td className="py-2.5 pr-3 text-zinc-400">{row.playbook}</td>
                        <td className="py-2.5 pr-3 tabular-nums">{row.entry.toFixed(2)}</td>
                        <td className="py-2.5 pr-3 tabular-nums">{row.stop.toFixed(2)}</td>
                        <td className="py-2.5 pr-3 tabular-nums text-zinc-400">
                          {row.rMultiple !== null ? `${row.rMultiple.toFixed(2)}R` : "—"}
                        </td>
                        <td
                          className={`py-2.5 pr-3 tabular-nums font-medium ${
                            row.pnl === null
                              ? "text-zinc-500"
                              : row.pnl >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                          }`}
                        >
                          {row.pnl !== null ? formatTradeUsd(row.pnl) : "—"}
                        </td>
                        <td className="py-2.5 pr-3 text-xs text-zinc-400">{statusLabel(row)}</td>
                        <td className="py-2.5 text-zinc-500">{row.date}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <footer className="border-t border-zinc-800 px-4 py-3 text-[10px] text-zinc-600 lg:px-6">
          Live data · v2 preview · Human actions first. AI infers. You approve. · Supabase is source
          of truth.
        </footer>
      </div>

      {/* Right panel */}
      <aside className="hidden w-72 shrink-0 flex-col gap-4 border-l border-zinc-800 p-4 xl:flex">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">Quick actions</h2>
          <p className="mt-0.5 text-xs text-zinc-500">Prefill assistant — same workflow</p>
          <ul className="mt-3 space-y-2">
            {QUICK_ACTIONS.map((action) => (
              <li key={action}>
                <button
                  type="button"
                  onClick={() => {
                    setAssistantText(action);
                    setTab("new");
                  }}
                  className="w-full rounded-lg border border-zinc-700 px-3 py-2 text-left text-xs text-zinc-400 hover:border-violet-500/40 hover:text-violet-300"
                >
                  {action}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">Open trades summary</h2>
          {data.openSummary.count === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No open positions.</p>
          ) : (
            <>
              <ul className="mt-3 space-y-2 text-sm">
                {data.openSummary.positions.map((p) => (
                  <li key={p.id} className="flex justify-between text-zinc-400">
                    <Link href={`/trades/${p.id}`} className="hover:text-violet-300">
                      {p.ticker} · {p.direction}
                    </Link>
                    <span className="text-zinc-500">
                      {p.risk !== null ? formatTradeUsd(-p.risk) : "—"} risk
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-zinc-800 pt-3 text-xs text-zinc-500">
                {data.openSummary.count} open · {formatTradeUsd(-data.openSummary.totalRisk)} planned
                risk
              </p>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">Trade insights</h2>
          <p className="mt-0.5 text-xs text-zinc-500">This cycle</p>
          <dl className="mt-3 space-y-2 text-sm">
            {data.insights.bestTrade && (
              <div className="flex justify-between">
                <dt className="text-zinc-500">Best trade</dt>
                <dd className="text-emerald-400">
                  {data.insights.bestTrade.ticker}{" "}
                  {formatTradeUsd(data.insights.bestTrade.pnl)}
                </dd>
              </div>
            )}
            {data.insights.worstTrade && (
              <div className="flex justify-between">
                <dt className="text-zinc-500">Worst trade</dt>
                <dd className="text-red-400">
                  {data.insights.worstTrade.ticker}{" "}
                  {formatTradeUsd(data.insights.worstTrade.pnl)}
                </dd>
              </div>
            )}
            {data.insights.highestR && (
              <div className="flex justify-between">
                <dt className="text-zinc-500">Highest R</dt>
                <dd className="text-zinc-300">{data.insights.highestR.r.toFixed(2)}R</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-zinc-500">Win rate</dt>
              <dd className="text-zinc-300">
                {data.insights.winRate !== null
                  ? `${(data.insights.winRate * 100).toFixed(1)}%`
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Expectancy</dt>
              <dd className="text-zinc-300">
                {data.insights.expectancy !== null
                  ? formatTradeUsd(data.insights.expectancy)
                  : "—"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">Recent closed</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.recentClosed.length === 0 ? (
              <li className="text-zinc-500">None yet.</li>
            ) : (
              data.recentClosed.map((t) => (
                <li key={t.id} className="flex justify-between">
                  <Link href={`/trades/${t.id}`} className="text-zinc-400 hover:text-violet-300">
                    {t.ticker}
                  </Link>
                  <span className={t.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {formatTradeUsd(t.pnl)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </aside>
    </div>
  );
}
