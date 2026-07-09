import type { DeliverPackageKind } from "./types";

export type DeliverPackageCard = {
  id: DeliverPackageKind;
  title: string;
  description: string;
  badge: string;
  badgeTone: "blue" | "red" | "green" | "purple" | "slate";
  available: boolean;
};

export const DELIVER_PACKAGES: DeliverPackageCard[] = [
  {
    id: "recognition_report",
    title: "Recognition Report",
    description: "For promotion, review or management. Show projects, contributions, timeline and key evidence.",
    badge: "High impact",
    badgeTone: "blue",
    available: false,
  },
  {
    id: "incident_package",
    title: "Incident Package",
    description: "For HR, legal or investigation. Chronology, emails, decisions, people and documents.",
    badge: "Highest integrity",
    badgeTone: "red",
    available: false,
  },
  {
    id: "quick_package",
    title: "Quick Package",
    description: "Fast handover summary. Timeline, evidence index, and file metadata — no ZIP bundling.",
    badge: "Fast action",
    badgeTone: "green",
    available: true,
  },
  {
    id: "knowledge_package",
    title: "Knowledge Package",
    description: "For handover or technical learning. Lessons, timeline, documents and related evidence.",
    badge: "Handover ready",
    badgeTone: "green",
    available: false,
  },
  {
    id: "relationship_brief",
    title: "Relationship Brief",
    description: "For meeting preparation. Timeline, interactions, projects, topics and follow-ups.",
    badge: "Quick context",
    badgeTone: "purple",
    available: false,
  },
  {
    id: "evidence_vault",
    title: "Evidence Vault",
    description: "Portable archive for backup or migration. All your linked data and files in one secure package.",
    badge: "Your professional memory",
    badgeTone: "slate",
    available: true,
  },
];

export function deliverPackageLabel(id: DeliverPackageKind): string {
  return DELIVER_PACKAGES.find((pkg) => pkg.id === id)?.title ?? id;
}

export function isDeliverPackageAvailable(id: DeliverPackageKind): boolean {
  return DELIVER_PACKAGES.find((pkg) => pkg.id === id)?.available ?? false;
}
