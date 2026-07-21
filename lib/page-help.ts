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
    summary: "Hoy: riesgo mensual y atención. No es Insights.",
    steps: [
      "Revisa room, opens y Needs attention.",
      "Stats profundas → Insights.",
      "AI Blocks: Control → Update.",
    ],
  },
  trades: {
    title: "Trades",
    summary: "Libro de posiciones: Open, Review, Closed.",
    steps: [
      "Open: riesgo vivo.",
      "Review: cierra el loop de aprendizaje.",
      "Enter Trade solo abre riesgo nuevo.",
    ],
  },
  insights: {
    title: "Insights",
    summary: "Aprender del ciclo: stats, journal, mistakes.",
    steps: ["Usa esto para ajustar playbooks — no para operar hoy."],
  },
  "new-trade": {
    title: "Enter Trade",
    summary: "Ejecutar un scout → trade-proposal → Control → Update.",
    steps: [
      "Antes: Scouting Desk (go).",
      "Copy boot package → IA → JSON.",
      "Después: posiciones en Trades.",
    ],
  },
  inbox: {
    title: "History",
    summary: "Propuestas pasadas. Apply escribe a Supabase.",
    steps: [
      "Preferir Control → Update para cambios nuevos.",
      "Apply / Reject en ítems pendientes.",
    ],
  },
  planning: {
    title: "Scouting Desk",
    panelLabel: "Help",
    workflowTitle: "Workflow",
    summary: "Decidir go / wait / no. No abre trades.",
    principles: [
      "Visualizar → snapshot → IA → AI Block.",
      "Enter Trade solo cuando el scout está listo.",
    ],
    copyButtons: [
      {
        button: "Scout snapshot ▾",
        copies: "Overview, ticker, scout plan o Mechanics.",
      },
      {
        button: "{TICKER} snapshot",
        copies: "Dossier del ticker.",
      },
    ],
    steps: [
      "Copia el snapshot adecuado.",
      "Pide un AI Block.",
      "Control → Update → Accept.",
      "Listo para entrar → Enter Trade.",
    ],
  },
  playbook: {
    title: "Playbook Lab",
    summary: "Método (HOW). Stats por playbook en Insights.",
    steps: ["Asigna playbook a cada trade.", "Revisa P/L en Insights."],
  },
  scouting: {
    title: "Scouting",
    panelLabel: "Help",
    workflowTitle: "Workflow",
    summary: "Igual que Scouting Desk.",
    steps: ["Snapshot → IA → Control → Update."],
  },
};

export function getPageHelp(pageId: PageHelpId): PageHelpContent {
  return PAGE_HELP[pageId];
}
