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
    summary:
      "Vista central del ciclo de trading: estado del experimento, riesgo mensual, atención pendiente y curva de equity.",
    steps: [
      "Revisa las métricas del día y el margen de pérdida mensual antes de operar.",
      "Atiende los ítems en «Needs attention» (reviews, inbox, playbooks).",
      "Usa «Dashboard snapshot» para dar contexto a tu asistente IA.",
      "Importa bloques JSON con «Import AI update» → Inbox → Apply.",
      "Expande «Asistente IA» para copiar solicitudes e importar bloques AI.",
      "Nada se escribe en Supabase hasta que apliques en Inbox.",
    ],
  },
  trades: {
    title: "Trades",
    summary:
      "Lista completa de operaciones y cola de revisión post-cierre en un solo lugar.",
    steps: [
      "Pestaña «All»: tabla de todas las operaciones con estado, playbook y P/L.",
      "Pestaña «Review»: cola de aprendizaje — reviews pendientes, inbox y asignación de playbook.",
      "Abre una operación para ver detalle o inicia el wizard de review en trades cerrados.",
      "Completa cada review con errores, lección y acción — alimenta Journal y Mistakes.",
    ],
  },
  insights: {
    title: "Insights",
    summary:
      "Estadísticas del ciclo, diario de operaciones cerradas y análisis de errores etiquetados.",
    steps: [
      "«Statistics»: equity, win rate, profit factor, drawdown y P/L por playbook.",
      "«Journal»: operaciones cerradas con lecciones y notas de review.",
      "«Mistakes»: costo acumulado por tipo de error y trades relacionados.",
      "Usa estos datos para decidir qué playbook o hábito mejorar.",
    ],
  },
  "new-trade": {
    title: "New Trade",
    summary:
      "Capa de ejecución: analiza en tu IA, importa un trade-proposal y aplica en Inbox.",
    steps: [
      "Opcional: selecciona un prospecto del Scouting Desk.",
      "Copy the boot package → paste in your external AI → final sizing and emotion check.",
      "Pide un bloque JSON trade-proposal cuando estés listo.",
      "Importa el bloque aquí o desde el Asistente IA del Dashboard.",
      "Revisa en Inbox → Apply. Human gate obligatorio antes de Supabase.",
      "Margen mensual restante se muestra en el flujo de propuesta.",
    ],
  },
  inbox: {
    title: "Inbox",
    summary:
      "Puerta humana: previsualiza propuestas de IA antes de aplicar cambios al vault.",
    steps: [
      "Las propuestas llegan desde el Asistente IA, Worker bridge o New Trade.",
      "Abre cada ítem para ver el diff y el payload estructurado.",
      "Apply confirma la escritura a Supabase; Reject descarta sin cambios.",
      "Tras aplicar, verifica la operación en Trades o el stock case en Scouting.",
    ],
  },
  planning: {
    title: "Scouting Desk",
    panelLabel: "Help",
    workflowTitle: "Workflow",
    summary:
      "Read-only command center. You do not analyze here — you visualize state, export a snapshot to your AI, discuss, then bring structured proposals back. Matrix stores outcomes after you Apply in Inbox.",
    principles: [
      "Visualization only — external AI does analysis; Matrix stores after Apply.",
      "Thesis lives on Stock Profile (WHO). Playbook is the method (HOW).",
      "Trade/scout changes: AI blocks → Inbox → Apply (trade-update, file-update, decision-update).",
    ],
    copyButtons: [
      {
        button: "Scout snapshot ▾",
        copies:
          "Dropdown: Scout desk overview (all profiles + scouts + monthly room), focused ticker, focused scout plan, and optional Matrix Mechanics snapshot.",
      },
      {
        button: "{TICKER} snapshot",
        copies:
          "On each stock file card: dossier for that ticker (profile + evidence). Open Stock Profile for linked scouts and full dossier.",
      },
    ],
    steps: [
      "Pick a ticker in Scouting summary (if you have more than one active stock file).",
      "Copy the snapshot slice that matches your question — desk overview vs one ticker vs one scout.",
      "Paste into your external AI. Discuss charts, thesis, go / wait / no. Ask for one JSON block (scout-assessment, file-update, or decision-update).",
      "Return: Import AI update → Dashboard assistant or Inbox → Apply.",
      "Review the proposal → Apply. Nothing writes to Supabase until you Apply.",
      "Trade changes (stop, target, close): same path — ask AI for trade-update or trade-close, then Apply in Inbox.",
      "Per-ticker: use the card snapshot button or open Stock Profile for the full dossier + evidence.",
    ],
  },
  playbook: {
    title: "Playbook Lab",
    summary:
      "Define y prueba estrategias: reglas, estado (active/testing) y muestras mínimas.",
    steps: [
      "Crea playbooks con criterios de entrada, salida y gestión.",
      "Asigna playbook a cada trade para estadísticas por estrategia.",
      "Estado TESTING requiere muestras mínimas antes de promover.",
      "Revisa P/L por playbook en Insights → Statistics.",
    ],
  },
  scouting: {
    title: "Scouting",
    panelLabel: "Help",
    workflowTitle: "Workflow",
    summary: "Same as Scouting Desk — see planning help for snapshot → AI → Inbox flow.",
    steps: [
      "Visualization only; analysis happens in your external AI.",
      "Connect → copy snapshot → external AI → paste → Accept inline.",
    ],
  },
};

export function getPageHelp(pageId: PageHelpId): PageHelpContent {
  return PAGE_HELP[pageId];
}
