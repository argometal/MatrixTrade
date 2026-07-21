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
    id: "pdf_deliver",
    title: "PDF",
    description: "Human-readable report — scope, timeline, evidence, and attachment index in one file.",
    badge: "Primary deliverable",
    badgeTone: "blue",
    available: true,
  },
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
    title: "Activity Summary",
    description: "Chronological index — what was recorded, when. HTML or Markdown. For skim and orientation.",
    badge: "Fast index",
    badgeTone: "green",
    available: true,
  },
  {
    id: "evidence_dossier",
    title: "Portable Archive",
    description:
      "ZIP you can open without Argus — report.html, emails as .eml (Outlook/Mail), notes as Markdown, original files, plus argus/ JSON for re-import.",
    badge: "Human + backup",
    badgeTone: "blue",
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
    description: "Internal backup — machine-readable JSON archive with files. Not for human review.",
    badge: "Backup only",
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
