/**
 * Operational organization (ArgusForge Phase 1).
 * States + user folders — never replace Argus Engine relations.
 */

export const OPERATIONAL_STATES = ["focus", "active", "archive"] as const;

export type OperationalState = (typeof OPERATIONAL_STATES)[number];

/** How Focus was set — calculated path reserved for MTA Engine (not implemented). */
export type FocusOrigin = "manual" | "calculated";

/**
 * User folder path within one operational state.
 * Segments only — never encode semantic relations.
 * Example: ["Projects", "MatrixTrade"] under state "active".
 */
export type FolderPath = string[];

export type OperationalPlacement = {
  state: OperationalState;
  /** Present when state === "focus". */
  focusOrigin?: FocusOrigin;
  /** User org only; unlimited depth; never replaces relations. */
  folderPath?: FolderPath;
};

/** New Chaos → Active by default. */
export function defaultOperationalPlacement(): OperationalPlacement {
  return { state: "active", folderPath: [] };
}

export function isOperationalState(value: string): value is OperationalState {
  return (OPERATIONAL_STATES as readonly string[]).includes(value);
}
