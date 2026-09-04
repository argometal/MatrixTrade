/**
 * PROMPT 15-12 — Canonical SNAPSHOT MENU / Control language.
 *
 * Ontology (do not conflate):
 * - UI label = exact visible button / copy-row text
 * - Snapshot ID = internal id (never ask the human to type this)
 * - Protocol/schema = paste body content
 * - Route = implementation path (e.g. /trades/{id})
 *
 * Rule: AI may ask humans to open/copy ONLY labels that exist literally on screen.
 * Library/primary nav names open drawers — they are not copy buttons unless listed here.
 */

export type VisibleControlKind =
  | "copy_row"
  | "window_menu"
  | "cta"
  | "write_path";

export type VisibleSnapshotMenuEntry = {
  /** Exact visible text the AI may ask the human to find or copy. */
  label: string;
  kind: VisibleControlKind;
  /** Find path using only other visible UI words (not routes as labels). */
  where: string;
  /** One-line purpose for Mechanics SNAPSHOT MENU. */
  purpose: string;
};

/**
 * Single source of truth for AI-facing copy/write targets.
 * Keep in sync with PlainCopyRow / SnapshotButton labels in the UI.
 */
export const VISIBLE_SNAPSHOT_MENU = [
  {
    label: "Start Here",
    kind: "copy_row",
    where: "Control → Start Here",
    purpose:
      "compact onboarding + intent/UI router — paste once per new AI chat (not full Mechanics)",
  },
  {
    label: "MTA Mechanics",
    kind: "copy_row",
    where: "Control → Library → Mechanics",
    purpose:
      "canonical operating constitution — MAF, Entry Solver, R$, TF governance (depth on demand)",
  },
  {
    label: "Apply schema contract",
    kind: "copy_row",
    where: "Control → Apply (copy row above paste)",
    purpose:
      "schema-first keys/enums for Apply Mode only — not Start Here, not Library Mechanics",
  },
  {
    label: "Snapshot general",
    kind: "copy_row",
    where: "Control detail drawers (first row when present)",
    purpose: "read-only aggregate of child snapshots at that level",
  },
  {
    label: "Library Index",
    kind: "copy_row",
    where: "Control → Library (home, above Library section rows)",
    purpose: "labels index — then request one exact copy row",
  },
  {
    label: "MTAE protocol",
    kind: "copy_row",
    where: "Control → Library → Technical Analysis",
    purpose: "technical analysis procedure (not Playbook, not Mechanics)",
  },
  {
    label: "Playbook snapshot",
    kind: "copy_row",
    where: "Control → Library → Playbook (or Playbook window menu)",
    purpose: "method + stats",
  },
  {
    label: "Scout desk overview",
    kind: "copy_row",
    where: "Control → Library → Scout Desk",
    purpose: "stock files + scouts + monthly risk room",
  },
  {
    label: "Dashboard snapshot",
    kind: "window_menu",
    where: "Dashboard (snapshot menu)",
    purpose: "global budget / experiment / attention summary",
  },
  {
    label: "Trades snapshot",
    kind: "window_menu",
    where: "Trades window (snapshot menu)",
    purpose: "execution records overview",
  },
  {
    label: "{TICKER} · {ID} trade",
    kind: "window_menu",
    where: "Trade detail window snapshot menu",
    purpose: "single trade execution record",
  },
  {
    label: "{TICKER} · {ID} forensic",
    kind: "window_menu",
    where: "Closed trade detail only (never a Control home section)",
    purpose: "closed-trade evidence only",
  },
  {
    label: "{TICKER} · {ID} historical attribution evidence",
    kind: "window_menu",
    where: "Historical / planless closed trade detail snapshot menu",
    purpose:
      "evidence pack for AI attribution proposal (tradeId; Plan/T0 may be absent) — not accepted MAF",
  },
  {
    label: "Analyze with AI",
    kind: "cta",
    where: "Stock File window (primary CTA)",
    purpose:
      "one package: full Mechanics (incl. MAF, Entry Solver, R$, TF governance) + MTAE + dossier + active Scout — no separate MAF/Entry Solver paste",
  },
  {
    label: "Apply",
    kind: "write_path",
    where: "Control → Apply",
    purpose: "paste → Validate → Accept (write path; not a snapshot paste)",
  },
] as const satisfies readonly VisibleSnapshotMenuEntry[];

/** Exact labels the AI may ask the human to copy / use (canonical allowlist). */
export const VISIBLE_SNAPSHOT_MENU_LABELS: readonly string[] = VISIBLE_SNAPSHOT_MENU.map(
  (entry) => entry.label
);

/** Nav-only names — open a section; never ask the human to “copy” these. */
export const CONTROL_NAV_LABELS_NOT_COPY_TARGETS = [
  "Stock Files",
  "Library",
  "Mechanics",
  "Technical Analysis",
  "Playbook",
  "Scout Desk",
  "MAF",
  "Insights",
] as const;

/** Internal resources with no dedicated visible copy row (do not invent a label). */
export const INTERNAL_RESOURCES_WITHOUT_DEDICATED_COPY_ROW = [
  {
    resource: "Apply schema JSON keys (protocol body)",
    note: "Copied only via the visible row Apply schema contract under Control → Apply.",
  },
  {
    resource: "MAF protocol body",
    note: "Embedded inside MTA Mechanics (Library → Mechanics) — no separate Control copy row.",
  },
  {
    resource: "Entry Solver pipeline body",
    note: "Embedded inside MTA Mechanics (Library → Mechanics) — no separate Control copy row.",
  },
  {
    resource: "R$ / timeframe governance rules",
    note: "Embedded inside MTA Mechanics (Library → Mechanics) — no separate Control copy row.",
  },
  {
    resource: "MTAE protocol body",
    note: "Copied only via the visible row MTAE protocol under Library → Technical Analysis (technical procedure; also summarized in Mechanics).",
  },
  {
    resource: "Snapshot IDs (e.g. mechanics, mtae-protocol)",
    note: "Internal — never ask the human to type or search by id.",
  },
] as const;

/**
 * SNAPSHOT MENU block embedded in MTA Mechanics brief/snapshot.
 * Generated from VISIBLE_SNAPSHOT_MENU — do not maintain a second hand-written list.
 */
export function formatSnapshotMenuForMechanics(): string {
  const lines: string[] = [
    "SNAPSHOT MENU (ask human to copy ONLY these exact visible labels)",
    "Ontology: UI label = button/row text · Snapshot ID = internal · Protocol/schema = paste body · Route = implementation.",
    "There is NO Request / Universal Request layer — the human already stated the task in chat.",
    "Control primary nav (opens drawers; not copy buttons): Start Here · Stock Files · Library · Apply.",
    "Control Library nav (opens drawers; not copy buttons): Mechanics · Technical Analysis · Playbook · Scout Desk · MAF.",
    "START vs MECHANICS: Start Here = intent/UI router (first paste). MTA Mechanics = full constitution (Library depth).",
    "Apply schema contract = write contract under Control → Apply only — never contaminate Start Here.",
    "FORBIDDEN: do not ask for separate MAF protocol or Entry Solver copies — both live inside MTA Mechanics.",
    "FORBIDDEN: do not ask the human to copy nav names Library, Mechanics, Technical Analysis, Playbook, Scout Desk, Insights, MAF, Learning, or Stock Files — open the section, then name the exact copy row below.",
    "FORBIDDEN: do not ask for Control → MTAE / Closed trade / Session / Case / Request / Update / Train AI / MTA Mechanics as a primary — retired or relocated.",
    "Human copies via Control, Dashboard, Stock File CTA, or the Trade window.",
  ];

  for (const entry of VISIBLE_SNAPSHOT_MENU) {
    lines.push(`- ${entry.label} — ${entry.purpose} (${entry.where})`);
  }

  lines.push(
    "Preferred Stock File loop (MTA-002A): Analyze with AI → chat → Apply AI Result → Open Scout.",
    "Request a specific slice by its visible label instead of guessing missing context."
  );

  return lines.join("\n");
}
