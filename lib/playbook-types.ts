export type PlaybookStatus = "TESTING" | "ACTIVE" | "RETIRED";

export interface Playbook {
  id: string;
  name: string;
  status: PlaybookStatus;
  description: string;
  checklist: string[];
  /** Normal thesis evaluation window (days). Default 90. */
  expectedHorizonDays?: number;
  /** Max observation after position close (days). Default 120. */
  maximumObservationDays?: number;
}

export const PLAYBOOK_STATUS_LABELS: Record<PlaybookStatus, string> = {
  TESTING: "Testing",
  ACTIVE: "Active",
  RETIRED: "Retired",
};
