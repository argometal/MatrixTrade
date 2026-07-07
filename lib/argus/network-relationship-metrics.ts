import type { Entity } from "./types";
import type { EntityIntelligence } from "./network-intelligence";

export const CONTACT_VALUE_KEYS = [
  "knowledge",
  "opportunity",
  "support",
  "inspiration",
  "alignment",
] as const;

export const MY_VALUE_KEYS = ["help", "knowledge", "opportunity", "connection", "trust"] as const;

export const RELATIONSHIP_STATUS_KEYS = ["healthy", "needs_attention", "dormant", "archived"] as const;

export const RELATIONSHIP_REASON_KEYS = [
  "no_action_required",
  "follow_up_pending",
  "opportunity_open",
  "waiting_response",
] as const;

export type ContactValueKey = (typeof CONTACT_VALUE_KEYS)[number];
export type MyValueKey = (typeof MY_VALUE_KEYS)[number];
export type RelationshipStatusKey = (typeof RELATIONSHIP_STATUS_KEYS)[number];
export type RelationshipReasonKey = (typeof RELATIONSHIP_REASON_KEYS)[number];

export const CONTACT_VALUE_OPTIONS: Array<{ key: ContactValueKey; label: string; description: string }> = [
  {
    key: "knowledge",
    label: "Knowledge",
    description: "I consistently learn valuable things from this person.",
  },
  {
    key: "opportunity",
    label: "Opportunity",
    description: "This relationship may create opportunities within the next 2–5 years.",
  },
  {
    key: "support",
    label: "Support",
    description: "This person actively helps solve problems or move work forward.",
  },
  {
    key: "inspiration",
    label: "Inspiration",
    description: "Conversations generate new ideas or ways of thinking.",
  },
  {
    key: "alignment",
    label: "Alignment",
    description: "We naturally collaborate well and communicate effectively.",
  },
];

export const MY_VALUE_OPTIONS: Array<{ key: MyValueKey; label: string; description: string }> = [
  { key: "help", label: "Help", description: "I help solve problems." },
  { key: "knowledge", label: "Knowledge", description: "I share useful knowledge or experience." },
  { key: "opportunity", label: "Opportunity", description: "I create opportunities for this person." },
  { key: "connection", label: "Connection", description: "I introduce people or useful resources." },
  { key: "trust", label: "Trust", description: "I consistently follow through and strengthen professional trust." },
];

export const RELATIONSHIP_STATUS_OPTIONS: Array<{ key: RelationshipStatusKey; label: string }> = [
  { key: "healthy", label: "Healthy" },
  { key: "needs_attention", label: "Needs attention" },
  { key: "dormant", label: "Dormant" },
  { key: "archived", label: "Archived" },
];

export const RELATIONSHIP_REASON_OPTIONS: Array<{ key: RelationshipReasonKey; label: string }> = [
  { key: "no_action_required", label: "No action required" },
  { key: "follow_up_pending", label: "Follow-up pending" },
  { key: "opportunity_open", label: "Opportunity still open" },
  { key: "waiting_response", label: "Waiting for response" },
];

export function countOfFive(values?: readonly string[]): string {
  return `${(values ?? []).length} of 5`;
}

export function normalizeContactValueKeys(values: string[] | undefined): ContactValueKey[] {
  const allowed = new Set(CONTACT_VALUE_KEYS);
  return [...new Set((values ?? []).filter((value): value is ContactValueKey => allowed.has(value as ContactValueKey)))];
}

export function normalizeMyValueKeys(values: string[] | undefined): MyValueKey[] {
  const allowed = new Set(MY_VALUE_KEYS);
  return [...new Set((values ?? []).filter((value): value is MyValueKey => allowed.has(value as MyValueKey)))];
}

export function normalizeRelationshipStatus(value: string | undefined): RelationshipStatusKey {
  return RELATIONSHIP_STATUS_KEYS.includes(value as RelationshipStatusKey)
    ? (value as RelationshipStatusKey)
    : "healthy";
}

export function normalizeRelationshipReason(value: string | undefined): RelationshipReasonKey {
  return RELATIONSHIP_REASON_KEYS.includes(value as RelationshipReasonKey)
    ? (value as RelationshipReasonKey)
    : "no_action_required";
}

export const RELATIONSHIP_STATUS_COLORS: Record<RelationshipStatusKey, string> = {
  healthy: "text-teal-400",
  needs_attention: "text-amber-400",
  dormant: "text-zinc-500",
  archived: "text-zinc-600",
};

export function contactValueLabel(key: ContactValueKey): string {
  return CONTACT_VALUE_OPTIONS.find((option) => option.key === key)?.label ?? key;
}

export function myValueLabel(key: MyValueKey): string {
  return MY_VALUE_OPTIONS.find((option) => option.key === key)?.label ?? key;
}

export function relationshipStatusLabel(key: RelationshipStatusKey): string {
  return RELATIONSHIP_STATUS_OPTIONS.find((option) => option.key === key)?.label ?? key;
}

export function relationshipReasonLabel(key: RelationshipReasonKey): string {
  return RELATIONSHIP_REASON_OPTIONS.find((option) => option.key === key)?.label ?? key;
}

export interface DerivedRelationshipAttention {
  status: RelationshipStatusKey;
  reason: RelationshipReasonKey;
}

/** Evidence-based attention — not user-editable. */
export function deriveRelationshipAttention(input: {
  entity: Entity;
  intel: EntityIntelligence;
  pendingInboxCount: number;
  today?: string;
}): DerivedRelationshipAttention {
  const { entity, intel, pendingInboxCount } = input;
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const notes = entity.notes ?? "";

  if (entity.deletedAt || /\bstatus:\s*archived\b/i.test(notes)) {
    return { status: "archived", reason: "no_action_required" };
  }

  const overdueFollowUp =
    Boolean(intel.nextFollowUp && intel.nextFollowUp < today) && intel.openFollowUps === 0;
  const opportunityOpen =
    (entity.contactValue ?? []).includes("opportunity") ||
    intel.topics.some((topic) => /opportunit/i.test(topic));

  let reason: RelationshipReasonKey = "no_action_required";
  if (intel.openFollowUps > 0 || overdueFollowUp) {
    reason = "follow_up_pending";
  } else if (pendingInboxCount > 0) {
    reason = "waiting_response";
  } else if (opportunityOpen) {
    reason = "opportunity_open";
  }

  let status: RelationshipStatusKey = "healthy";
  if (intel.relationshipHealth === "dormant" || intel.relationshipHealth === "neglected") {
    status = "dormant";
  } else if (
    reason !== "no_action_required" ||
    intel.relationshipHealth === "cooling" ||
    (intel.daysSinceLastInteraction !== null && intel.daysSinceLastInteraction > 90)
  ) {
    status = "needs_attention";
  } else if (intel.relationshipHealth === "active") {
    status = "healthy";
  }

  if (
    status === "healthy" &&
    intel.logCount === 0 &&
    pendingInboxCount === 0 &&
    intel.daysSinceLastInteraction === null
  ) {
    status = "dormant";
    reason = "no_action_required";
  }

  return { status, reason };
}

export function attentionSummaryMessage(attention: DerivedRelationshipAttention): string {
  if (attention.status === "archived") {
    return "This relationship is archived. No active follow-up is expected.";
  }
  if (attention.status === "dormant") {
    return "This relationship has gone quiet. Consider a light touch when timing is right.";
  }
  if (attention.status === "needs_attention" && attention.reason === "follow_up_pending") {
    return "A follow-up is pending. Review open items and schedule the next touch.";
  }
  if (attention.status === "needs_attention" && attention.reason === "waiting_response") {
    return "Linked inbox items are waiting. A response or triage step may be needed.";
  }
  if (attention.status === "needs_attention" && attention.reason === "opportunity_open") {
    return "An opportunity signal is open. Keep momentum while context is fresh.";
  }
  if (attention.status === "needs_attention") {
    return "This relationship needs attention based on recent activity signals.";
  }
  return "This relationship is healthy. No action is required at this time.";
}

export const CONTACT_VALUE_ICONS: Record<ContactValueKey, string> = {
  knowledge: "📘",
  opportunity: "📈",
  support: "🤝",
  inspiration: "💡",
  alignment: "🎯",
};

export const MY_VALUE_ICONS: Record<MyValueKey, string> = {
  help: "🛠",
  knowledge: "📘",
  opportunity: "📈",
  connection: "🔗",
  trust: "✓",
};
