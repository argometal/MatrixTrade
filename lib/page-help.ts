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
      "Casos vivos: Scout. Histórico: Trades.",
    ],
  },
  trades: {
    title: "Trades",
    summary:
      "Histórico filtrable. Closed ≠ complete — alerta cuando falta review o campos de aprendizaje.",
    steps: [
      "Si hay banner ámbar: cierra el loop (review / playbook / PLAN / R / post-stop).",
      "Filtra por veredicto para mejorar data.",
      "Hipótesis incompletas siguen en data (filtro Sin veredicto).",
    ],
  },
  insights: {
    title: "Insights",
    summary: "Stats / journal / mistakes del ciclo.",
    steps: ["Ajustar Playbook con lo aprendido."],
  },
  "new-trade": {
    title: "Enter Trade (deprecated)",
    summary: "Redirige a Scout. Ejecución: boot package → Control → Apply.",
    steps: ["Usa Scout war room."],
  },
  inbox: {
    title: "History",
    summary: "Propuestas. Preferir Control → Apply.",
    steps: ["Apply / Reject en pendientes."],
  },
  planning: {
    title: "Scout",
    panelLabel: "Help",
    workflowTitle: "Workflow",
    summary: "Active cases and execution readiness — decision and numbers first.",
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
