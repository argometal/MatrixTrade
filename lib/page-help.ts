export type PageHelpId =
  | "dashboard"
  | "trades"
  | "insights"
  | "new-trade"
  | "inbox"
  | "planning"
  | "playbook"
  | "scouting";

export type PageHelpContent = {
  title: string;
  summary: string;
  steps: string[];
};

export const PAGE_HELP: Record<PageHelpId, PageHelpContent> = {
  dashboard: {
    title: "Dashboard",
    summary:
      "Vista central del ciclo de trading: estado del experimento, riesgo mensual, atención pendiente y curva de equity.",
    steps: [
      "Revisa las métricas del día y el margen de pérdida mensual antes de operar.",
      "Atiende los ítems en «Needs attention» (reviews, inbox, playbooks).",
      "Usa «Copy Snapshot» para dar contexto a tu asistente IA.",
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
      "Copia el paquete boot → pégalo en ChatGPT/Claude para sizing y chequeo emocional.",
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
    summary:
      "Planificación pre-trade: playbook (cómo), stock case (quién) y decisión go/wait/no.",
    steps: [
      "Crea o edita planes vinculados a playbooks y stock theses.",
      "Copia el paquete de scouting → IA → importa scout-assessment o file-update.",
      "Apply en Inbox actualiza el caso o la decisión.",
      "Los prospectos listos aparecen en New Trade para ejecución.",
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
    summary: "Alias de Scouting Desk — evaluación de oportunidades antes de abrir trade.",
    steps: [
      "Mismo flujo que Scouting Desk: stock case + decisión + riesgo.",
      "Usa el Asistente IA del Dashboard para importar evaluaciones.",
    ],
  },
};

export function getPageHelp(pageId: PageHelpId): PageHelpContent {
  return PAGE_HELP[pageId];
}
