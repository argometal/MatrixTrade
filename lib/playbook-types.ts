export type PlaybookStatus = "TESTING" | "ACTIVE" | "RETIRED";

/** Playbook-level experiment — evaluated across many stocks, not one ticker. */
export type PlaybookExperimentScope = "playbook";

export interface Playbook {
  id: string;
  name: string;
  status: PlaybookStatus;
  description: string;
  checklist: string[];
  /** Reusable methodology principles (not ticker-specific). */
  principles?: string[];
  /** Hypothesis tested across qualified trades in this playbook. */
  experimentHypothesis?: string;
  experimentScope?: PlaybookExperimentScope;
}

export const PLAYBOOK_STATUS_LABELS: Record<PlaybookStatus, string> = {
  TESTING: "Testing",
  ACTIVE: "Active",
  RETIRED: "Retired",
};
