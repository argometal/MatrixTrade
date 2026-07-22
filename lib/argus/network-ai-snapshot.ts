import { buildArgusNetworkBrief } from "./network-ai-brief";
import { NETWORK_AI_BLOCK_REQUEST } from "./network-ai-block";
import {
  personHasContactEvidence,
  NETWORK_CAPTURE_LENSES,
  NETWORK_CONTACT_FLOW,
  NETWORK_OPENING_QUESTIONS,
} from "./network-dialogue";
import {
  attentionSummaryMessage,
  relationshipReasonLabel,
  relationshipStatusLabel,
} from "./network-relationship-metrics";
import type {
  V2NetworkBrowseCard,
  V2NetworkBrowseInsight,
  V2NetworkBrowseSummary,
} from "./v2/network-browse-utils";
import type { NetworkContactPageData } from "./v2/network-contact-loaders";

export type NetworkAiSnapshotScope = "network-desk" | "network-person";

function formatDeskHighlights(cards: V2NetworkBrowseCard[]): string {
  const dormant = cards.filter((c) => c.status === "Dormant" || c.status === "Lost").slice(0, 5);
  const due = cards
    .filter((c) => c.status === "Active" && c.strength >= 60)
    .slice(0, 5);

  const lines = ["=== HIGHLIGHTS ==="];
  if (due.length) {
    lines.push("", "Active / high-value:");
    for (const c of due) {
      lines.push(`- ${c.name} (${c.status}, strength ${c.strength}%) — ${c.lastInteraction.timeLabel}`);
    }
  }
  if (dormant.length) {
    lines.push("", "Dormant / revisit:");
    for (const c of dormant) {
      lines.push(`- ${c.name} (${c.status}) — last: ${c.lastInteraction.timeLabel}`);
    }
  }
  if (!due.length && !dormant.length) lines.push("(no highlights — add people or log contact)");
  return lines.join("\n");
}

export function buildNetworkDeskBody(input: {
  summary: V2NetworkBrowseSummary;
  insights: V2NetworkBrowseInsight;
  cards: V2NetworkBrowseCard[];
}): string {
  const { summary, insights, cards } = input;
  const statusLine = Object.entries(insights.statusCounts)
    .map(([k, v]) => `${k}:${v}`)
    .join(" ");

  const recent = insights.recentInteractions
    .slice(0, 6)
    .map((r) => `- ${r.personName}: ${r.label} (${r.timeLabel})`)
    .join("\n");

  return [
    "=== NETWORK DESK ===",
    `people:${summary.total} active:${summary.active} dormant:${summary.dormant} new:${summary.new} lost:${summary.lost}`,
    `orgs:${summary.organizations} projects_together:${summary.projectsTogether} avg_strength:${summary.averageStrength}%`,
    `status_counts: ${statusLine}`,
    "",
    "=== RECENT INTERACTIONS ===",
    recent || "(none logged)",
    "",
    formatDeskHighlights(cards),
  ].join("\n");
}

function dialogueGuideSection(personName: string): string {
  const questions = NETWORK_OPENING_QUESTIONS.slice(0, 4).map((q) => `- ${q}`).join("\n");
  const flow = NETWORK_CONTACT_FLOW.map((s) => `${s.step}. ${s.label}: ${s.detail}`).join("\n");
  const lenses = NETWORK_CAPTURE_LENSES.map((l) => `- ${l}`).join("\n");
  return [
    `=== DIALOGUE GUIDE · ${personName} ===`,
    "No contact evidence yet — use dialogue guide, not relationship scoring.",
    "",
    "Flow:",
    flow,
    "",
    "Opening questions (pick one):",
    questions,
    "",
    "Capture lenses after conversation:",
    lenses,
  ].join("\n");
}

function relationshipOverviewSection(page: NetworkContactPageData): string {
  const { entity, intel, attention, timeline } = page;
  const timelineSnippet = timeline
    .slice(0, 5)
    .map((t) => `- [${t.kind}] ${t.date.slice(0, 10)}: ${t.title}`)
    .join("\n");

  return [
    `=== RELATIONSHIP OVERVIEW · ${entity.name} ===`,
    `health:${intel.relationshipHealth} days_since:${intel.daysSinceLastInteraction ?? "—"} open_followups:${intel.openFollowUps}`,
    `attention:${relationshipStatusLabel(attention.status)} — ${relationshipReasonLabel(attention.reason)}`,
    attentionSummaryMessage(attention),
    "",
    `contact_value:${(entity.contactValue ?? []).join(", ") || "—"}`,
    `my_value:${(entity.myValue ?? []).join(", ") || "—"}`,
    `topics:${intel.topics.slice(0, 8).join(", ") || "—"}`,
    "",
    "=== TIMELINE SNIPPET ===",
    timelineSnippet || "(no entries)",
  ].join("\n");
}

export function buildNetworkPersonBody(page: NetworkContactPageData): string {
  const { entity, role, organization, intel, tags } = page;
  const hasContact = personHasContactEvidence(page.timeline.length);

  const parts = [
    `=== NETWORK PERSON · ${entity.name} ===`,
    `id:${entity.id}`,
    `role:${role}`,
    `org:${organization?.name ?? "—"}`,
    `strength_signals: logs=${intel.logCount} evidence=${intel.evidenceCount} outcome=${intel.outcomeScore}`,
    `tags:${tags.slice(0, 10).join(", ") || "—"}`,
    "",
    hasContact ? relationshipOverviewSection(page) : dialogueGuideSection(entity.name),
  ];

  return parts.join("\n");
}

export function buildNetworkAiSnapshot(input: {
  scope: NetworkAiSnapshotScope;
  desk?: {
    summary: V2NetworkBrowseSummary;
    insights: V2NetworkBrowseInsight;
    cards: V2NetworkBrowseCard[];
  };
  person?: NetworkContactPageData;
}): string {
  const brief = buildArgusNetworkBrief();
  let body: string;
  switch (input.scope) {
    case "network-desk":
      body = input.desk ? buildNetworkDeskBody(input.desk) : "(no desk data)";
      break;
    case "network-person":
      body = input.person ? buildNetworkPersonBody(input.person) : "(no person data)";
      break;
    default:
      body = "(unknown scope)";
  }
  const templates = [
    "",
    "=== CONTACT CREATE TEMPLATE ===",
    "name:",
    "role:",
    "organization:",
    "email:",
    "notes:",
    "tags:",
    "",
    "=== AFTER CONVERSATION (existing person) ===",
    "entityId:",
    "what happened:",
    "follow-up date:",
    "tags:",
  ].join("\n");
  return [brief, "", body, "", templates, "", "=== REQUEST ===", NETWORK_AI_BLOCK_REQUEST].join("\n");
}
