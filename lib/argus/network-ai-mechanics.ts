import type { SnapshotMenuItem } from "@/lib/snapshot-types";
import { wrapSnapshotText } from "@/lib/snapshot-verification";
import { buildArgusNetworkBrief } from "./network-ai-brief";
import { NETWORK_AI_BLOCK_REQUEST } from "./network-ai-block";
import {
  NETWORK_CAPTURE_LENSES,
  NETWORK_CONTACT_FLOW,
  NETWORK_DIALOGUE_PILLARS,
  NETWORK_OPENING_QUESTIONS,
  personHasContactEvidence,
} from "./network-dialogue";
import {
  buildNetworkDeskBody,
  buildNetworkPersonBody,
} from "./network-ai-snapshot";
import type { NetworkContactPageData } from "./v2/network-contact-loaders";
import type {
  V2NetworkBrowseCard,
  V2NetworkBrowseInsight,
  V2NetworkBrowseSummary,
} from "./v2/network-browse-utils";

/** One copyable Library block — registry entry; label must match the Network Panel UI. */
export type NetworkContextBlockDef = {
  id: string;
  /** Exact label shown in the Library (AI must request by this string). */
  label: string;
  description: string;
  /** Library category header (Contact, Desk, Rules, …). */
  category: string;
  contains: string[];
  requestWhen: string[];
  scope: "person" | "desk" | "global";
  sensitive: boolean;
  requiredBeforeApply: boolean;
  text: string;
};

export type NetworkRecordState = {
  person_exists: boolean;
  network_profile_exists: boolean;
  contact_data_available: boolean;
  timeline_available: boolean;
  dialogue_history_available: boolean;
  person_id?: string;
  person_name?: string;
};

export type NetworkPanelPackage = {
  mechanics: SnapshotMenuItem;
  /** Catalog of evidence/context blocks the AI may request by exact label. */
  library: SnapshotMenuItem[];
  /** Grouped Library rows for UI (category → items). */
  libraryGroups: Array<{ category: string; items: SnapshotMenuItem[] }>;
  defaultEntityId?: string;
  panelTitle: string;
};

const NETWORK_CAPABILITIES = [
  "Create a new person contact (network-create-person)",
  "Capture a conversation on an existing person (network-capture)",
  "Register a journal note / follow-up / tags / metrics (legacy block types still supported)",
  "Analyze relationship context from supplied evidence only",
  "Build a networking action plan as analysis — never invent events",
  "Identify missing information and name the exact Library block to copy next",
].join("\n- ");

const FIELD_TEMPLATES = [
  "FIELD TEMPLATES (for analysis — final output must still be Apply JSON)",
  "=== CONTACT CREATE ===",
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

function dialogueBehaviorSection(): string {
  const pillars = NETWORK_DIALOGUE_PILLARS.map((p) => `- ${p.label}: ${p.hint}`).join("\n");
  const flow = NETWORK_CONTACT_FLOW.map((s) => `${s.step}. ${s.label}: ${s.detail}`).join("\n");
  const questions = NETWORK_OPENING_QUESTIONS.slice(0, 4)
    .map((q) => `- ${q}`)
    .join("\n");
  const lenses = NETWORK_CAPTURE_LENSES.map((l) => `- ${l}`).join("\n");
  return [
    "DIALOGUE BEHAVIOR",
    "Network is dialogue-first — not pipeline scoring.",
    "",
    "Pillars:",
    pillars,
    "",
    "Contact flow:",
    flow,
    "",
    "Opening questions (pick one that fits):",
    questions,
    "",
    "Capture lenses after conversation:",
    lenses,
  ].join("\n");
}

const AI_BEHAVIOR_CONTRACT = [
  "AI BEHAVIOR CONTRACT (follow in order)",
  "1. Understand Network Mechanics and CURRENT_RECORD_STATE.",
  "2. The human’s task is stated naturally in chat after Mechanics (e.g. “Review this contact”, “Create a person”, “Analyze this relationship”). There is no separate Request prompt — treat their message as the work intent.",
  "3. If intent is unclear, ask what they want to accomplish.",
  "4. Classify the task: create | update | analyze | conversation capture | relationship planning | information review | other supported operation.",
  "5. Decide whether current context is sufficient.",
  "6. If not sufficient: name the exact Library block by its visible UI label from AVAILABLE_CONTEXT_BLOCKS; explain briefly why; request only that minimum block; STOP.",
  "7. Continue after the human pastes that block.",
  "8. Separate known historical facts | interpretation | proposed future actions.",
  "9. Never invent contact facts, meetings, emails, or outcomes.",
  "10. Do not generate Apply JSON until enough information exists.",
  "11. When ready, say information is sufficient and return ONE valid Apply JSON block.",
  "12. Applying JSON is a human action in Network Panel → Apply.",
].join("\n");

function formatRecordState(state: NetworkRecordState): string {
  const lines = [
    "CURRENT_RECORD_STATE",
    `person_exists: ${state.person_exists}`,
    `network_profile_exists: ${state.network_profile_exists}`,
    `contact_data_available: ${state.contact_data_available}`,
    `timeline_available: ${state.timeline_available}`,
    `dialogue_history_available: ${state.dialogue_history_available}`,
  ];
  if (state.person_id) lines.push(`person_id: ${state.person_id}`);
  if (state.person_name) lines.push(`person_name: ${state.person_name}`);
  return lines.join("\n");
}

function formatContextIndex(blocks: NetworkContextBlockDef[]): string {
  const parts = [
    "AVAILABLE_CONTEXT_BLOCKS (Library)",
    "These live under Network Panel → Library. Request by exact visible UI label (quote the label). Do not invent labels.",
  ];
  blocks.forEach((block, index) => {
    parts.push("");
    parts.push(`${index + 1}. "${block.label}"`);
    parts.push(`   id: ${block.id}`);
    parts.push(`   category: ${block.category}`);
    parts.push(`   scope: ${block.scope}`);
    parts.push(`   sensitive: ${block.sensitive}`);
    parts.push(`   required_before_apply: ${block.requiredBeforeApply}`);
    parts.push("   Contains:");
    for (const line of block.contains) parts.push(`   - ${line}`);
    parts.push("   Request when:");
    for (const line of block.requestWhen) parts.push(`   - ${line}`);
  });
  return parts.join("\n");
}

function toMenuItem(block: NetworkContextBlockDef): SnapshotMenuItem {
  return {
    id: block.id,
    label: block.label,
    description: block.description,
    text: block.text,
  };
}

function groupLibrary(blocks: NetworkContextBlockDef[]): Array<{ category: string; items: SnapshotMenuItem[] }> {
  const order: string[] = [];
  const map = new Map<string, SnapshotMenuItem[]>();
  for (const block of blocks) {
    if (!map.has(block.category)) {
      map.set(block.category, []);
      order.push(block.category);
    }
    map.get(block.category)!.push(toMenuItem(block));
  }
  return order.map((category) => ({ category, items: map.get(category)! }));
}

export function buildNetworkPersonRecordState(page: NetworkContactPageData): NetworkRecordState {
  const { entity, timeline, role, organization, email, tags } = page;
  const hasContactEvidence = personHasContactEvidence(timeline.length);
  const contactData =
    Boolean(role && role !== "Professional contact") ||
    Boolean(organization) ||
    Boolean(email) ||
    (entity.notes ?? "").trim().length > 0 ||
    tags.length > 0 ||
    (entity.contactValue ?? []).length > 0 ||
    (entity.myValue ?? []).length > 0;

  return {
    person_exists: true,
    network_profile_exists: entity.type === "person" && !entity.deletedAt,
    contact_data_available: contactData,
    timeline_available: timeline.length > 0,
    dialogue_history_available: hasContactEvidence,
    person_id: entity.id,
    person_name: entity.name,
  };
}

export function buildNetworkDeskRecordState(summary: V2NetworkBrowseSummary): NetworkRecordState {
  return {
    person_exists: false,
    network_profile_exists: false,
    contact_data_available: summary.total > 0,
    timeline_available: false,
    dialogue_history_available: false,
  };
}

function charterBlock(): NetworkContextBlockDef {
  return {
    id: "network-charter",
    label: "Network charter brief",
    description: "ARGUS rules, past vs future, human Apply gate",
    category: "Rules",
    contains: [
      "Network identity (not CRM)",
      "Past vs future lens",
      "No-invention and human Apply rules",
    ],
    requestWhen: [
      "Mechanics was not pasted in this AI session",
      "Validating Apply rules before final JSON",
    ],
    scope: "global",
    sensitive: false,
    requiredBeforeApply: false,
    text: wrapSnapshotText("Network charter brief", buildArgusNetworkBrief()),
  };
}

function personContactBlock(page: NetworkContactPageData): NetworkContextBlockDef {
  const label = `${page.entity.name} · Contact`;
  const body = buildNetworkPersonBody(page);
  return {
    id: "network-person",
    label,
    description: "Contact context, timeline snippet, dialogue or relationship overview",
    category: "Contact",
    contains: [
      "Profile fields (id, role, org, tags)",
      "Timeline snippet (titles only)",
      "Dialogue guide OR relationship overview",
    ],
    requestWhen: [
      "Determining create vs update for this person",
      "Reviewing stored knowledge before capture or analysis",
      "Preparing a profile or relationship update",
    ],
    scope: "person",
    sensitive: true,
    requiredBeforeApply: true,
    text: wrapSnapshotText(`${page.entity.name} contact snapshot`, body),
  };
}

function deskSnapshotBlock(input: {
  cards: V2NetworkBrowseCard[];
  summary: V2NetworkBrowseSummary;
  insights: V2NetworkBrowseInsight;
}): NetworkContextBlockDef {
  const body = buildNetworkDeskBody(input);
  return {
    id: "network-desk",
    label: "Network desk snapshot",
    description: "Browse summary, status counts, due/dormant highlights",
    category: "Desk",
    contains: [
      "People counts and status breakdown",
      "Recent interactions",
      "Due / dormant highlights",
    ],
    requestWhen: [
      "Working from the Network desk without a selected person",
      "Choosing whom to contact or create next",
    ],
    scope: "desk",
    sensitive: true,
    requiredBeforeApply: false,
    text: wrapSnapshotText("Network desk snapshot", body),
  };
}

export function buildNetworkMechanicsPrompt(input: {
  state: NetworkRecordState;
  contextBlocks: NetworkContextBlockDef[];
  focusLine?: string;
}): string {
  const { state, contextBlocks, focusLine } = input;
  const identity = [
    "=== ARGUS NETWORK MECHANICS ===",
    "",
    "IDENTITY",
    "ARGUS Network is the networking directory and relationship layer of ARGUS — an Evidence Organization System.",
    "It is a professional relationship CRM for conversations, prospects, and co-creation — NOT a sales pipeline CRM.",
    "Past lens: evidence of what happened (Register · Deliver · Timeline).",
    "Network lens: people, dialogue, and what we may build together.",
  ].join("\n");

  const focus = focusLine
    ? ["", "FOCUS", focusLine].join("\n")
    : state.person_name
      ? ["", "FOCUS", `Current person: ${state.person_name} (${state.person_id})`].join("\n")
      : ["", "FOCUS", "Network desk — no person selected."].join("\n");

  return [
    identity,
    focus,
    "",
    buildArgusNetworkBrief(),
    "",
    formatRecordState(state),
    "",
    "HOW WORK STARTS",
    "After Mechanics is pasted, the human writes naturally in chat — there is no separate Request prompt.",
    "Examples: “Review this contact.” · “Create a new person.” · “Analyze this relationship.” · “Capture what we discussed.”",
    "Decide create vs update from CURRENT_RECORD_STATE — do not guess from the name alone.",
    "If evidence is missing, stop and ask for one Library block by exact UI label.",
    "",
    "SUPPORTED_OPERATIONS",
    `- ${NETWORK_CAPABILITIES}`,
    "",
    "AVAILABLE_OUTPUTS",
    "- Natural-language analysis and next-step guidance",
    "- Clarifying question naming one exact Library block to copy",
    "- ONE Apply JSON block when evidence is sufficient (see APPLY_CONTRACT)",
    "",
    dialogueBehaviorSection(),
    "",
    formatContextIndex(contextBlocks),
    "",
    FIELD_TEMPLATES,
    "",
    "APPLY_CONTRACT",
    NETWORK_AI_BLOCK_REQUEST,
    "",
    AI_BEHAVIOR_CONTRACT,
    "",
    "SESSION START",
    "After reading Mechanics, greet with record state awareness.",
    "If the human has not yet stated a task, ask what they want to do.",
    "If they already stated a task, proceed — or request the next exact Library block if context is insufficient.",
  ].join("\n");
}

function buildPackage(input: {
  state: NetworkRecordState;
  contextBlocks: NetworkContextBlockDef[];
  focusLine: string;
  panelTitle: string;
  defaultEntityId?: string;
}): NetworkPanelPackage {
  const mechanicsText = wrapSnapshotText(
    "Network Mechanics",
    buildNetworkMechanicsPrompt({
      state: input.state,
      contextBlocks: input.contextBlocks,
      focusLine: input.focusLine,
    })
  );

  return {
    mechanics: {
      id: "network-mechanics",
      label: "Network Mechanics",
      description: "Orient the AI — rules, capabilities, record state, and Library index.",
      text: mechanicsText,
    },
    library: input.contextBlocks.map(toMenuItem),
    libraryGroups: groupLibrary(input.contextBlocks),
    defaultEntityId: input.defaultEntityId,
    panelTitle: input.panelTitle,
  };
}

export function buildNetworkContactPanelPackage(page: NetworkContactPageData): NetworkPanelPackage {
  const state = buildNetworkPersonRecordState(page);
  const contextBlocks = [personContactBlock(page), charterBlock()];
  return buildPackage({
    state,
    contextBlocks,
    focusLine: `Current person: ${page.entity.name} (${page.entity.id})`,
    panelTitle: page.entity.name,
    defaultEntityId: page.entity.id,
  });
}

export function buildNetworkBrowsePanelPackage(input: {
  cards: V2NetworkBrowseCard[];
  summary: V2NetworkBrowseSummary;
  insights: V2NetworkBrowseInsight;
}): NetworkPanelPackage {
  const state = buildNetworkDeskRecordState(input.summary);
  const contextBlocks = [deskSnapshotBlock(input), charterBlock()];
  return buildPackage({
    state,
    contextBlocks,
    focusLine: "Network desk — no person selected.",
    panelTitle: "Network desk",
  });
}
