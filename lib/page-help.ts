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
  /** Collapsed tab + section labels (defaults: Spanish). */
  panelLabel?: string;
  workflowTitle?: string;
  /** Optional design principles — shown before workflow steps. */
  principles?: string[];
  /** Snapshot / copy buttons reference table. */
  copyButtons?: PageHelpCopyButton[];
};

export const PAGE_HELP: Record<PageHelpId, PageHelpContent> = {
  dashboard: {
    title: "Dashboard",
    summary: "Estado del ciclo: riesgo mensual, atención pendiente y equity.",
    steps: [
      "Revisa margen mensual y «Needs attention».",
      "Snapshot: botón en cabecera o Control panel.",
      "AI Blocks: Control → Update → Validate → Accept.",
      "Imports antiguos: History → Apply.",
    ],
  },
  trades: {
    title: "Trades",
    summary: "Operaciones y cola de review post-cierre.",
    steps: [
      "«All»: tabla completa.",
      "«Review»: reviews pendientes y History.",
      "Cierra el ciclo con review en cada trade cerrado.",
    ],
  },
  insights: {
    title: "Insights",
    summary: "Stats, journal y mistakes del ciclo.",
    steps: [
      "Statistics, Journal y Mistakes — usa datos para ajustar playbooks.",
    ],
  },
  "new-trade": {
    title: "New Trade",
    summary: "IA externa → trade-proposal → History o Control → Update.",
    steps: [
      "Opcional: prospecto desde Scouting Desk.",
      "Copy boot package → IA → JSON trade-proposal.",
      "Control → Update → Accept, o envía a History → Apply.",
    ],
  },
  inbox: {
    title: "History",
    summary: "Propuestas pasadas. Apply escribe a Supabase.",
    steps: [
      "Entradas desde New Trade, Worker o imports legacy.",
      "Apply confirma; Reject descarta.",
      "Nuevos cambios: Control → Update (directo).",
    ],
  },
  planning: {
    title: "Scouting Desk",
    panelLabel: "Help",
    workflowTitle: "Workflow",
    summary:
      "Solo visualización. Snapshot → IA externa → AI Block → Control → Update o History → Apply.",
    principles: [
      "La IA analiza fuera; Matrix guarda tras Accept/Apply.",
      "Tesis en Stock Profile; playbook = método.",
    ],
    copyButtons: [
      {
        button: "Scout snapshot ▾",
        copies: "Overview del desk, ticker, scout plan o Mechanics.",
      },
      {
        button: "{TICKER} snapshot",
        copies: "Dossier del ticker en la tarjeta o Stock Profile.",
      },
    ],
    steps: [
      "Copia el snapshot que encaje con tu pregunta.",
      "Pide un bloque JSON (scout-assessment, file-update, decision-update, trade-update, trade-close).",
      "Control → Update → Validate → Accept.",
      "trade-update / trade-close: mismo flujo.",
    ],
  },
  playbook: {
    title: "Playbook Lab",
    summary: "Estrategias, reglas y estado active/testing.",
    steps: [
      "Asigna playbook a cada trade.",
      "P/L por playbook en Insights.",
    ],
  },
  scouting: {
    title: "Scouting",
    panelLabel: "Help",
    workflowTitle: "Workflow",
    summary: "Igual que Scouting Desk — snapshot → IA → AI Block.",
    steps: [
      "Control panel: copia contexto → IA → Control → Update.",
    ],
  },
};

export function getPageHelp(pageId: PageHelpId): PageHelpContent {
  return PAGE_HELP[pageId];
}
