export type PlaybookStatus = "TESTING" | "ACTIVE" | "RETIRED";

export interface Playbook {
  id: string;
  name: string;
  status: PlaybookStatus;
  description: string;
  checklist: string[];
}

export const PLAYBOOK_STATUS_LABELS: Record<PlaybookStatus, string> = {
  TESTING: "Testing",
  ACTIVE: "Active",
  RETIRED: "Retired",
};
