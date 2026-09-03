export type PageHelpId =
  | "dashboard"
  | "trades"
  | "insights"
  | "new-trade"
  | "inbox"
  | "planning"
  | "playbook"
  | "scouting";

export type PageHelpCopyButton = {
  button: string;
  copies: string;
};

export type PageHelpContent = {
  title: string;
  summary: string;
  steps: string[];
  panelLabel?: string;
  workflowTitle?: string;
  principles?: string[];
  copyButtons?: PageHelpCopyButton[];
};

export const PAGE_HELP: Record<PageHelpId, PageHelpContent> = {
  dashboard: {
    title: "Dashboard",
    summary: "Hoy: riesgo y atención. Insights = aprender.",
    steps: [
      "Revisa room y Needs attention.",
      "AI Blocks: Control → Apply.",
      "Casos vivos: Scout. History: Trades.",
    ],
  },
  trades: {
    title: "Trades",
    panelLabel: "Help",
    summary:
      "Filterable history. Closed ≠ complete — alert when review or learning fields are missing.",
    principles: [
      "Review and missing fields stay on Trades — not Scout war room.",
      "Use the Review tab for pending human review on closed fills.",
    ],
    steps: [
      "If the amber banner is up: close the loop (review / playbook / PLAN / R / post-stop).",
      "Filter by verdict to improve data quality.",
      "Incomplete hypotheses stay in data (No verdict filter).",
    ],
  },
  insights: {
    title: "Insights",
    panelLabel: "Help",
    workflowTitle: "Pipeline Learning",
    summary:
      "Insights converts completed and maturing Cases into measurable evidence about decision quality, participation, execution, outcomes and recurring failure patterns. Pipeline Performance is the canonical Learning surface.",
    principles: [
      "Chain: Plan → T0 → Reality → Execution/Outcome → Case equation → diagnosis.",
      "A · Good Entry / Profit — valid participation, acceptable DQ/EQ, favorable outcome (not merely profit).",
      "B · No Entry — may be Good Filter, Missed / Over-Optimized Entry, or Insufficient Evidence. Not automatically a missed opportunity.",
      "C · Good Entry / Loss — valid decision and execution with adverse outcome. Outcome ≠ Decision Quality.",
      "D · Decision / Execution Failure — DQ not_supported and/or EQ violated. Adverse outcome alone does not create D.",
      "? · Insufficient Evidence — not enough frozen evidence to classify reliably (common when T0 is missing).",
      "Good Filter: conditions did not justify participation. Missed / Over-Optimized Entry: frozen requirements were met but the system still did not participate. Later price alone does not prove a missed entry.",
      "Decision Quality evaluates whether the original T0 decision was supported by frozen evidence — Outcome does not rewrite DQ.",
      "Execution Quality: whether actual execution respected frozen Plan geometry/constraints.",
      "Counterfactual R is hypothetical plan-path magnitude — not realized P/L, not DQ, not proof a No Entry was wrong.",
      "MAF attribution describes possible component drag; it does not independently determine Case Family or DQ. Persistence follows the Matrix store gate (local JSON or Supabase maf_experiments).",
      "False Virtuous Loop: the system may look disciplined because it often avoids entries, while evidence suggests excessive filtering may suppress valid participation and learning. High No Entry alone is not failure.",
      "Case Review shows T0 → Reality → Execution → Outcome → Evaluation → Equation → Diagnosis for one Case.",
      "Historical Reconstruction (pre-MXT) is reconstructed evidence/hints — not accepted MAF and never verified T0. Accepted MAF on a historical Case is separate canonical attribution when present.",
      "Statistics / Journal / Mistakes remain adjacent analytics; they are not a second Learning dashboard.",
    ],
    steps: [
      "Open Pipeline Performance for Case accounting and filters.",
      "Use Case family / no-entry diagnosis filters — values are canonical enums under human labels.",
      "Open Case Review from drill-down for equationId and missing evidence.",
      "Treat Component Attribution as drag evidence, not a second judge.",
      "Use Statistics for cycle P/L and Playbook P/L; use Pipeline for Case equations.",
    ],
  },
  "new-trade": {
    title: "Enter Trade (deprecated)",
    summary: "Redirige a Scout. Ejecución: boot package → Control → Apply.",
    steps: ["Usa Scout war room."],
  },
  inbox: {
    title: "Proposals",
    summary: "Propuestas. Preferir Control → Apply.",
    steps: ["Apply / Reject en pendientes."],
  },
  planning: {
    title: "Scout",
    panelLabel: "Help",
    workflowTitle: "Workflow",
    summary: "Active plans · decision · readiness — numbers first; thesis and capital via links.",
    principles: [
      "Casos ordenados por planned R alto → bajo.",
      "Un caso seleccionado a la vez.",
      "Full thesis / invalidation / evidence live in Details or Snapshot.",
      "Fills cerrados incompletos → Trades, no misión de Scout.",
    ],
    copyButtons: [
      {
        button: "Snapshot",
        copies: "Caso enfocado / desk package.",
      },
      {
        button: "Trade boot",
        copies: "Contexto de ejecución para trade-proposal.",
      },
    ],
    steps: [
      "Elige el case en el selector.",
      "Revisa niveles / R / room.",
      "Trade boot → Control → Apply → Accept.",
      "Texto completo → Details o Snapshot.",
    ],
  },
  playbook: {
    title: "Playbook",
    summary: "Trade books — políticas (HOW).",
    steps: ["Asigna playbook a cada fill.", "P/L por playbook en Insights."],
  },
  scouting: {
    title: "Scout",
    panelLabel: "Help",
    workflowTitle: "Workflow",
    summary: "Igual que Scout war room.",
    steps: ["Snapshot → IA → Control → Apply."],
  },
};

export function getPageHelp(pageId: PageHelpId): PageHelpContent {
  return PAGE_HELP[pageId];
}
