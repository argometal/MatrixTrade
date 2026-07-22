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
      "Histórico filtrable: éxito, perdido, entrada tardía, jamás ejecutado. Sin veredicto = aún en Scout.",
    steps: [
      "Filtra por veredicto para mejorar data.",
      "Review cierra el loop de fills cerrados.",
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
    summary: "War room de un caso: radiografía + execute. No es el histórico.",
    principles: [
      "Un caso seleccionado a la vez.",
      "Copy boot → AI → Control → Apply → Accept.",
      "Trades = veredictos filtrables.",
    ],
    copyButtons: [
      {
        button: "Scout snapshot ▾",
        copies: "Caso enfocado / desk / Mechanics.",
      },
      {
        button: "Copy trade boot package",
        copies: "Contexto de ejecución para trade-proposal.",
      },
    ],
    steps: [
      "Elige el case en el selector.",
      "Revisa niveles / R / invalidation.",
      "Copy boot → pega en Control el AI Block.",
      "Veredictos y no-entradas → Trades.",
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
