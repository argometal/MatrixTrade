/**
 * Shared MTA Help topics — contextual ? panels (Argus-style).
 * Page-level help remains in `lib/page-help.ts` (PageHelpPanel).
 */

import { CAPITAL_ALLOCATION_FLOW } from "@/lib/capital-help";

export type MtaHelpSection = {
  id: string;
  title: string;
  intro?: string;
  items: Array<{ title: string; body: string }>;
  tip?: string;
};

const SECTIONS: MtaHelpSection[] = [
  {
    id: "dashboard-attention",
    title: "Needs attention",
    intro:
      "Operational queue for the current experiment cycle — not a second Scout desk.",
    items: [
      {
        title: "How to clear an item",
        body: "Copy for AI → diagnose → one Apply block → Control → Apply. Use the Dashboard snapshot when you need global context.",
      },
      {
        title: "Empty queue",
        body: "Nothing pending means the cycle is on track for attention items.",
      },
    ],
  },
  {
    id: "dashboard-scout-monitoring",
    title: "Scout monitoring",
    intro: "Detection surface only — no automatic Scout mutation from this panel.",
    items: [
      {
        title: "What the buckets mean",
        body: "Passed, Action now, Needs review, Waiting, and Low probability group plans by detected/confirmed operational state.",
      },
      {
        title: "What to do next",
        body: "Open Scout, prepare a status update, or open Plan Map from the case. Changes still go through Control → Apply.",
      },
    ],
  },
  {
    id: "dashboard-experiment-pnl",
    title: "Experiment cumulative P/L",
    intro:
      "Closed-trade experiment P/L only — not Account Equity. Monthly risk cap is a separate control.",
    items: [
      {
        title: "Why it differs from equity",
        body: "This chart tracks experiment trade results. Capital account equity and settled cash live in Capital Planner / Settings.",
      },
    ],
  },
  {
    id: "scout-learning-queue",
    title: "Scout learning queue",
    intro:
      "Close the learning circuit before opening new Scouts on the same thesis window.",
    items: [
      {
        title: "Needs outcome",
        body: "Record Outcome on the focused plan (Scout ≠ Trade P/L). Prefer Planning → Record Outcome or Apply plan-outcome.",
      },
      {
        title: "Needs sync repair",
        body: "Outcome already persisted but Learning Sync failed. Use Retry Learning Sync — do not re-Apply the same outcome block.",
      },
    ],
    tip: "Armed ≠ submitted. Automatic broker execution is off unless explicitly enabled.",
  },
  {
    id: "plan-record-outcome",
    title: "Record Outcome",
    intro:
      "Scout outcome is a plan-learning record — not account P/L and not a fictitious Trade.",
    items: [
      {
        title: "What it does not do",
        body: "Does not invalidate the Stock File thesis. Does not create a Trade fill. MAF attribution remains a separate later action.",
      },
      {
        title: "Armed vs submitted",
        body: "executionReadiness armed means the desk is ready — not that orders were submitted. Automatic execution stays gated.",
      },
      {
        title: "Sync repair",
        body: "If learning sync is pending/failed after an accepted outcome, Retry Learning Sync only — do not re-Apply the same plan-outcome.",
      },
    ],
  },
  {
    id: "layered-entry",
    title: "Layered entry",
    intro:
      "Levels proposed by human/AI · MTA calculates R and risk · final human approval required via Control → Apply.",
    items: [
      {
        title: "R vs money",
        body: "R measures efficiency of the structure. Assigned loss and potential gain come from authorized risk and share counts when configured.",
      },
      {
        title: "No chase",
        body: "If all predefined limits miss, the trade is cancelled per experiment rule — do not chase higher.",
      },
      {
        title: "Shares",
        body: "Missing share fields stay unconfigured — MTA does not invent size for funding or prepare-trade.",
      },
    ],
  },
  {
    id: "modified-kelly",
    title: "Modified Kelly layered entry",
    intro: "Experiment · risk distribution only · no broker automation.",
    items: [
      {
        title: "How to enable",
        body: "Select the Modified Kelly playbook and Apply a Scout layeredEntry with executionModel \"modified_kelly\".",
      },
      {
        title: "What it calculates",
        body: "Base risk R, additional Kelly risk, and per-limit risk weights — still subject to human Apply acceptance.",
      },
    ],
  },
  {
    id: "family-b-bull-trend",
    title: "Family B · Bull trend",
    intro:
      "Levels proposed by human/AI · MTA calculates R · Scout GO/WAIT/NO decision remains separate.",
    items: [
      {
        title: "Starter / preferred / deep",
        body: "Propose layered limits via Analyze → Apply. Empty layers mean no layered entry is on the plan yet.",
      },
    ],
  },
  {
    id: "scout-allocation-board",
    title: "Scout Allocation Board",
    intro:
      "Advisory simulation only — does not reserve capital or create trades.",
    items: [
      {
        title: "What selection does",
        body: "Orders Scouts for a before/after funding preview using the shared allocation simulator.",
      },
      {
        title: "To reserve capital",
        body: "Use Scout Funding Snapshot → Control → Apply capital-reservation-create after Validate.",
      },
    ],
  },
  {
    id: "capital-planner",
    title: "Capital Planner",
    intro:
      "Model A cash-ledger. Settled cash and equity are independent. Scout approval does not auto-reserve capital.",
    items: [
      {
        title: "Allocation flow",
        body: CAPITAL_ALLOCATION_FLOW,
      },
      {
        title: "Identifiers",
        body: "Use Scout Funding Snapshot on a Scout Plan — do not gather identifiers manually from separate screens.",
      },
    ],
    tip: "Manage sources and privacy in Capital Settings.",
  },
  {
    id: "funding-follow-up",
    title: "Funding follow-up",
    intro:
      "Prepared proposal does not reserve capital until Control → Apply → Validate → Accept.",
    items: [
      {
        title: "Prepare Funding JSON",
        body: "Builds a suggested capital-reservation-create block from the current Scout funding fingerprint.",
      },
    ],
  },
  {
    id: "trades-incomplete",
    title: "Closed ≠ complete",
    intro:
      "A closed trade can still miss review or learning fields. That work stays on Trades — not Scout war room.",
    items: [
      {
        title: "What to finish",
        body: "Review, playbook, PLAN link, R multiple, and post-stop notes when required by the incomplete checklist.",
      },
      {
        title: "Review queue",
        body: "Use the Review tab to clear pending human review on closed fills.",
      },
    ],
  },
  {
    id: "insights-pipeline",
    title: "Insights · Pipeline",
    intro:
      "Results by pipeline component — realized Trade P/L stays separate from Scout counterfactuals.",
    items: [
      {
        title: "Stats / Journal / Mistakes",
        body: "Cycle metrics, trading log, and tagged error cost. Use them to decide what to improve next.",
      },
      {
        title: "Do not mix ledgers",
        body: "Scout R and plan outcomes are counterfactual learning — not account P/L.",
      },
    ],
  },
  {
    id: "control-apply",
    title: "Control · Apply",
    intro:
      "Paste AI Block → Validate → Accept writes to MTA. Mutations only happen here.",
    items: [
      {
        title: "Workflow",
        body: "Mechanics once per chat → task in natural language → copy only the block AI asks for → Apply.",
      },
      {
        title: "Editor behavior",
        body: "Editor clears after every Apply attempt. On invalid JSON or validation errors, use Snap Failure to copy the report.",
      },
    ],
  },
  {
    id: "ai-blocks-home",
    title: "AI Blocks",
    intro: "Control → Apply on any page. Copy context from the Control panel.",
    items: [
      {
        title: "Legacy removed",
        body: "Dashboard Paste AI Block (legacy) is removed. Do not look for a bottom paste panel on /home-preview.",
      },
    ],
  },
];

const BY_ID = new Map(SECTIONS.map((s) => [s.id, s]));

export function getMtaHelpTopic(id: string): MtaHelpSection | undefined {
  return BY_ID.get(id);
}

export function listMtaHelpTopics(): MtaHelpSection[] {
  return SECTIONS;
}
