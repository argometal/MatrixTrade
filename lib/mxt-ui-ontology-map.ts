/**
 * Canonical MXT concept → internal Apply type → human UI surface map.
 * Start Here and routing tests must not invent UI for internal ops.
 *
 * Layers:
 * A) Conceptual ontology
 * B) Human interface (visible labels only)
 * C) Internal / Apply operations (JSON block types — never presented as buttons)
 */

import { AI_BRIDGE_BLOCK_TYPES } from "./ai-bridge-types";

export type MxtUiSurface =
  | {
      kind: "header" | "sidebar" | "control" | "page" | "cta" | "window_menu";
      visibleLabel: string;
      location: string;
      route?: string;
    }
  | { kind: "none"; note: string };

export type MxtOntologyUiRow = {
  concept: string;
  canonicalObject: string;
  internalOperations: readonly string[];
  humanUi: MxtUiSurface;
  humanAction: string;
  resultingState: string;
};

/** Visible global / sidebar destinations (must match preview-nav + chrome). */
export const MXT_VISIBLE_NAV = {
  header: ["Start Here", "Control"] as const,
  sidebar: [
    "Dashboard",
    "Scout",
    "Capital",
    "Trades",
    "Playbook",
    "Insights",
    "Proposals",
    "Help",
    "Capital Settings",
    "Security",
    "System",
  ] as const,
  controlPrimaries: ["Mechanics", "Stock Files", "Library", "Apply"] as const,
  controlLibrary: [
    "Library Index",
    "Technical Analysis",
    "Playbook",
    "Scout Desk",
    "MAF",
  ] as const,
} as const;

/**
 * Core ontology ↔ UI mapping used by Start Here and acceptance tests.
 * Internal op names are listed for AI understanding — NEVER as click targets.
 */
export const MXT_ONTOLOGY_UI_MAP: readonly MxtOntologyUiRow[] = [
  {
    concept: "Stock File (new)",
    canonicalObject: "StockThesis / Stock File",
    internalOperations: ["stock-case-create"],
    humanUi: {
      kind: "page",
      visibleLabel: "New stock case",
      location: "Sidebar Scout → New stock case · or Trades → New stock case",
      route: "/mxt/stock-theses/new",
    },
    humanAction:
      "Open New stock case page; after AI builds JSON, persist via Control → Apply (or page paste / Proposals)",
    resultingState: "New Stock File (+ required initial Scout geometry in create block)",
  },
  {
    concept: "Stock File (existing lookup)",
    canonicalObject: "StockThesis / Stock File",
    internalOperations: ["file-update", "technical-assessment", "scout-assessment"],
    humanUi: {
      kind: "control",
      visibleLabel: "Stock Files",
      location: "Header → Control → Stock Files",
    },
    humanAction: "Search ticker; open match — or empty list means ticker not created yet",
    resultingState: "Read existing dossier / open Stock File window",
  },
  {
    concept: "Stock File Analyze package",
    canonicalObject: "StockThesis + Mechanics + MTAE + Scout",
    internalOperations: [],
    humanUi: {
      kind: "cta",
      visibleLabel: "Analyze with AI",
      location: "Stock File window (open ticker dossier)",
    },
    humanAction: "Copy Analyze with AI package into chat",
    resultingState: "AI receives ticker context (not a write)",
  },
  {
    concept: "Scout Plan (new window on existing Stock File)",
    canonicalObject: "TradePlan / Scout Plan",
    internalOperations: ["scout-plan-create", "file-update.initialScout (backfill only)"],
    humanUi: {
      kind: "sidebar",
      visibleLabel: "Scout",
      location: "Sidebar → Scout (war room)",
      route: "/mxt/scout",
    },
    humanAction:
      "Confirm Stock File exists first; work in Scout; persist new plan via Control → Apply (AI emits scout-plan-create)",
    resultingState: "New PLAN-* linked to existing Stock File",
  },
  {
    concept: "Scout decision / tactical update",
    canonicalObject: "TradePlan decision",
    internalOperations: ["decision-update", "layered-entry-update", "scout-assessment"],
    humanUi: {
      kind: "sidebar",
      visibleLabel: "Scout",
      location: "Sidebar → Scout → open case/plan",
    },
    humanAction: "Open Scout case; AI proposes decision-update JSON → Control → Apply",
    resultingState: "Updated scout decision / geometry",
  },
  {
    concept: "Technical Analysis (MTAE)",
    canonicalObject: "TechnicalAssessment",
    internalOperations: ["technical-assessment", "technical-calibration"],
    humanUi: {
      kind: "control",
      visibleLabel: "MTAE protocol",
      location: "Control → Library → Technical Analysis → copy MTAE protocol",
    },
    humanAction: "Copy protocol when procedure depth needed; charts come from human; persist via Apply",
    resultingState: "Technical assessment applied to Stock File when accepted",
  },
  {
    concept: "Playbook",
    canonicalObject: "Playbook",
    internalOperations: ["playbook-create", "playbook-update"],
    humanUi: {
      kind: "sidebar",
      visibleLabel: "Playbook",
      location: "Sidebar → Playbook",
      route: "/mxt/playbook",
    },
    humanAction: "Open Playbook lab; Library → Playbook snapshot for AI method context",
    resultingState: "Method context / playbook CRUD via Apply when needed",
  },
  {
    concept: "Trade",
    canonicalObject: "Trade",
    internalOperations: [
      "trade-proposal",
      "trade-update",
      "trade-close",
      "trade-review",
      "analysis",
    ],
    humanUi: {
      kind: "sidebar",
      visibleLabel: "Trades",
      location: "Sidebar → Trades",
      route: "/mxt/trades",
    },
    humanAction: "Open Trades / trade detail; persist via Control → Apply",
    resultingState: "Trade created/updated/closed",
  },
  {
    concept: "Observation",
    canonicalObject: "Observation",
    internalOperations: ["observation-update"],
    humanUi: {
      kind: "none",
      note: "No dedicated Observation sidebar — via Trade/Scout context + Apply observation-update",
    },
    humanAction: "Work from Trade/Scout evidence; AI emits observation-update → Apply",
    resultingState: "Observation fields updated",
  },
  {
    concept: "MAF / Attribution",
    canonicalObject: "MafExperiment / attribution",
    internalOperations: ["attribution"],
    humanUi: {
      kind: "window_menu",
      visibleLabel: "{TICKER} · {ID} forensic / historical attribution evidence",
      location: "Trades → closed trade detail snapshot menus",
    },
    humanAction: "Copy forensic/attribution evidence; MAF rules via Control → Mechanics; Apply attribution",
    resultingState: "Attribution proposal accepted (not auto-MAF)",
  },
  {
    concept: "Plan outcome / evaluation",
    canonicalObject: "LearningOutcome / Case",
    internalOperations: ["plan-outcome"],
    humanUi: {
      kind: "sidebar",
      visibleLabel: "Insights",
      location: "Sidebar → Insights → Pipeline Performance (also Journal / Mistakes)",
      route: "/mxt/stats?tab=pipeline",
    },
    humanAction: "Open Insights evaluation surfaces; persist plan-outcome via Apply when recording",
    resultingState: "Evaluated case / recorded unexecuted outcome",
  },
  {
    concept: "Capital",
    canonicalObject: "CapitalConfiguration / Reservation",
    internalOperations: [
      "capital-configuration-create",
      "capital-configuration-update",
      "capital-reservation-create",
      "capital-reservation-update",
      "capital-reservation-release",
      "capital-ledger-adjustment",
    ],
    humanUi: {
      kind: "sidebar",
      visibleLabel: "Capital / Capital Settings",
      location: "Sidebar → Capital (planner) · Capital Settings (configuration)",
    },
    humanAction: "Edit/prepare in Capital surfaces; persist capital-* via Control → Apply",
    resultingState: "Account capital state updated",
  },
  {
    concept: "Proposals inbox",
    canonicalObject: "TradingInboxItem",
    internalOperations: ["(any Apply block type pending review)"],
    humanUi: {
      kind: "sidebar",
      visibleLabel: "Proposals",
      location: "Sidebar → Proposals",
      route: "/mxt/inbox",
    },
    humanAction: "Review pending AI Blocks; Apply path also via Control → Apply",
    resultingState: "Accepted or rejected proposal",
  },
  {
    concept: "Apply persistence",
    canonicalObject: "Apply gate",
    internalOperations: [...AI_BRIDGE_BLOCK_TYPES],
    humanUi: {
      kind: "control",
      visibleLabel: "Apply",
      location: "Header → Control → Apply (+ Apply schema contract copy row)",
    },
    humanAction: "Paste AI Block → Validate → Accept",
    resultingState: "Persisted object mutation",
  },
  {
    concept: "Operating rules (Mechanics)",
    canonicalObject: "Mechanics constitution",
    internalOperations: [],
    humanUi: {
      kind: "control",
      visibleLabel: "MTA Mechanics",
      location: "Control → Mechanics → copy MTA Mechanics",
    },
    humanAction: "Copy when deep HOW-to-reason rules are required",
    resultingState: "AI reasoning constraints (read-only paste)",
  },
] as const;

/** Internal identifiers that must NEVER be presented as human UI controls. */
export const MXT_INTERNAL_OPS_NOT_UI = [
  "stock-case-create",
  "stock-case-delete",
  "stock-case-update",
  "file-update",
  "file-update.initialScout",
  "scout-plan-create",
  "scout-plan-update",
  "decision-update",
  "recordScoutDecision",
  "technical-assessment",
  "trade-proposal",
  "attribution",
  "plan-outcome",
  "initialScout",
] as const;

export function formatOntologyUiMapForStartHere(): string {
  const lines: string[] = [
    "ONTOLOGY ↔ HUMAN UI (verified against current product)",
    "Format: Concept → Internal op(s) → Human UI → Human action",
    "",
  ];
  for (const row of MXT_ONTOLOGY_UI_MAP) {
    const ui =
      row.humanUi.kind === "none"
        ? `NONE (${row.humanUi.note})`
        : `${row.humanUi.visibleLabel} @ ${row.humanUi.location}`;
    lines.push(
      `- ${row.concept}`,
      `  object: ${row.canonicalObject}`,
      `  internal: ${row.internalOperations.join(", ") || "(none — context only)"}`,
      `  UI: ${ui}`,
      `  human: ${row.humanAction}`,
      `  result: ${row.resultingState}`,
      ""
    );
  }
  return lines.join("\n").trimEnd();
}
