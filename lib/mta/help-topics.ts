/**
 * MTA section help — contextual ? panels (Argus V2IntelHelpLink strategy).
 * Explanations live here; UI keeps short labels + ?.
 */

export type MtaHelpItem = {
  title: string;
  body: string;
};

export type MtaHelpTopic = {
  id: string;
  title: string;
  group: "dashboard" | "scout" | "trades" | "capital" | "system";
  intro?: string;
  items: MtaHelpItem[];
  tip?: string;
};

const TOPICS: MtaHelpTopic[] = [
  {
    id: "dashboard-status",
    title: "Today's status",
    group: "dashboard",
    intro: "Cycle control strip — room, experiment, and open work at a glance.",
    items: [
      {
        title: "Monthly budget / carryover / room",
        body: "Risk budget for this month. Room is what you can still lose before the cap. Not account equity.",
      },
      {
        title: "Experiment cumulative P/L",
        body: "Closed trade experiment P/L only. Separate from Capital Planner cash/equity and External Positions.",
      },
      {
        title: "Scout watching / plans to evaluate",
        body: "Live Scout cases vs plans that failed or expired and need strategy review — not fills.",
      },
    ],
  },
  {
    id: "dashboard-attention",
    title: "Needs attention",
    group: "dashboard",
    intro: "Human-in-the-loop queue. Nothing here mutates data by itself.",
    items: [
      {
        title: "Workflow",
        body: "Copy context for AI → diagnose → one Apply block → Control → Apply.",
      },
      {
        title: "Dashboard snapshot",
        body: "Use the snapshot menu for global desk context when asking AI about the cycle.",
      },
      {
        title: "Scout vs Trades",
        body: "Live cases and prepare/execute stay in Scout. Incomplete closed fills stay on Trades.",
      },
    ],
    tip: "Prefer Control → Apply over ad-hoc edits. One proposal at a time.",
  },
  {
    id: "dashboard-scout-monitoring",
    title: "Scout monitoring",
    group: "dashboard",
    intro: "Detection surface only — no automatic Scout mutation from this panel.",
    items: [
      {
        title: "Buckets",
        body: "Passed · Action now · Needs review · Waiting · Low probability — operational read of confirmed vs detected state.",
      },
      {
        title: "Next step",
        body: "Open the case in Scout / prepare a status update / open Plan Map. Apply still goes through Control.",
      },
    ],
  },
  {
    id: "dashboard-experiment-pnl",
    title: "Experiment cumulative P/L",
    group: "dashboard",
    intro: "Curve of closed-trade experiment P/L for the active cycle.",
    items: [
      {
        title: "What it is",
        body: "Sum of realized experiment outcomes on closed trades. Not Capital cash, not External Positions, not Scout counterfactuals.",
      },
      {
        title: "Empty chart",
        body: "Appears after the first closed trade in the cycle.",
      },
    ],
  },
  {
    id: "trades-incomplete",
    title: "Closed ≠ complete",
    group: "trades",
    intro: "A closed fill can still be incomplete for learning (review, playbook, PLAN link, R, post-stop).",
    items: [
      {
        title: "Where to finish",
        body: "Stay on Trades (Review tab / incomplete filter). Do not treat Scout war room as the place to close learning loops.",
      },
      {
        title: "Veredictos",
        body: "Filter Histórico by éxito / perdido / late entry / never executed / sin veredicto to improve data quality.",
      },
    ],
    tip: "Incomplete closed trades still count in experiment P/L once closed — finish the learning fields separately.",
  },
  {
    id: "trades-ledger",
    title: "Trades ledger",
    group: "trades",
    intro: "Histórico filtrable of executed outcomes and related plan rows.",
    items: [
      {
        title: "Histórico",
        body: "Executed fills plus operational paths (no ejecutados / review).",
      },
      {
        title: "Scout boundary",
        body: "Scout owns live watching/ready cases. Closed and verdict work lands here.",
      },
    ],
  },
  {
    id: "scout-war-room",
    title: "Scout war room",
    group: "scout",
    intro: "Active cases and execution readiness — decision and numbers first.",
    items: [
      {
        title: "Case order",
        body: "Cases ordered by planned R high → low. One selected case at a time.",
      },
      {
        title: "Full thesis",
        body: "Full thesis / invalidation / evidence live in Details or Snapshot — not as wall-of-text in the card.",
      },
      {
        title: "Execute path",
        body: "Trade boot → Control → Apply → Accept. Incomplete closed fills → Trades, not Scout.",
      },
    ],
    tip: "Snapshot = desk package. Trade boot = execution context for trade-proposal.",
  },
  {
    id: "scout-funding",
    title: "Funding & execution",
    group: "scout",
    intro: "Capital readiness for the focused Scout case — does not reserve funds by itself.",
    items: [
      {
        title: "Snapshot",
        body: "Funding snapshot shows cash/equity/room context for this plan when Capital is configured.",
      },
      {
        title: "Prepare Funding",
        body: "Follow-up proposals still require Control → Apply. Accepting a decision-update does not auto-reserve.",
      },
      {
        title: "Allocation",
        body: "Active reservations and allocation impact are informational until Apply commits them.",
      },
    ],
  },
  {
    id: "scout-execute",
    title: "Execute",
    group: "scout",
    intro: "Levels, R, and boot package for the selected case.",
    items: [
      {
        title: "Levels / R",
        body: "Entry, stop, targets and planned R for the focused geometry. Geometry changes go through decision-update Apply.",
      },
      {
        title: "Trade boot",
        body: "Copies execution context for a trade-proposal. Still human Apply — never auto-fill.",
      },
    ],
  },
  {
    id: "capital-settings",
    title: "Capital Settings",
    group: "capital",
    intro: "Prepare capital-configuration proposals only — nothing persists until Control → Apply.",
    items: [
      {
        title: "Cash vs equity",
        body: "Settled cash ≠ total equity. Configure complete pairs (value + as-of). Omit = unchanged; null clears with as-of.",
      },
      {
        title: "SQL prerequisites",
        body: "Capital Planner and External Positions tables must exist in Supabase before writes succeed.",
      },
      {
        title: "Privacy",
        body: "Default status snapshot omits balances. Private snapshot is explicit + confirmed.",
      },
    ],
    tip: "Use the checklist in Capital Help for live setup status on this machine.",
  },
];

export const MTA_HELP_TOPICS = TOPICS;

export function getMtaHelpTopic(id: string): MtaHelpTopic | undefined {
  return TOPICS.find((t) => t.id === id);
}
