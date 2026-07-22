import type { SnapshotMenuItem } from "@/lib/snapshot-types";
import { wrapSnapshotText } from "@/lib/snapshot-verification";
import { buildArgusNetworkBrief } from "./network-ai-brief";
import { NETWORK_AI_BLOCK_REQUEST } from "./network-ai-block";
import { personHasContactEvidence } from "./network-dialogue";
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

/** One copyable context block — registry entry built with the same label/text as the UI. */
export type NetworkContextBlockDef = {
  id: string;
  /** Exact label shown in the Network Panel (AI must request by this string). */
  label: string;
  description: string;
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
  request: SnapshotMenuItem;
  additional: SnapshotMenuItem[];
  defaultEntityId?: string;
  panelTitle: string;
};

const NETWORK_CAPABILITIES = [
  "Create a new person contact (network-create-person)",
  "Capture a conversation on an existing person (network-capture)",
  "Register a journal note / follow-up / tags / metrics (legacy block types still supported)",
  "Analyze relationship context from supplied evidence only",
  "Build a networking action plan as analysis — never invent events",
  "Identify missing information and name the exact UI block to copy next",
].join("\n- ");

const AI_BEHAVIOR_CONTRACT = [
  "AI BEHAVIOR CONTRACT (follow in order)",
  "1. Understand Network Mechanics and CURRENT_RECORD_STATE.",
  "2. Ask what the human wants to accomplish, unless the Request already states it.",
  "3. Classify the task: create | update | analyze | conversation capture | relationship planning | information review | other supported operation.",
  "4. Decide whether current context is sufficient.",
  "5. If not sufficient: name the exact ARGUS context block by its visible UI label from AVAILABLE_CONTEXT_BLOCKS; explain briefly why; request only that minimum block; STOP.",
  "6. Continue after the human pastes that block.",
  "7. Separate known historical facts | interpretation | proposed future actions.",
  "8. Never invent contact facts, meetings, emails, or outcomes.",
  "9. Do not generate Apply JSON until enough information exists.",
  "10. When ready, say information is sufficient and return ONE valid Apply JSON block.",
  "11. Applying JSON is a human action in Network Panel → Apply.",
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
    "AVAILABLE_CONTEXT_BLOCKS",
    "Request blocks by exact visible UI label (quote the label). Do not invent labels.",
  ];
  blocks.forEach((block, index) => {
    parts.push("");
    parts.push(`${index + 1}. "${block.label}"`);
    parts.push(`   id: ${block.id}`);
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
    "SUPPORTED_OPERATIONS",
    `- ${NETWORK_CAPABILITIES}`,
    "",
    "AVAILABLE_OUTPUTS",
    "- Natural-language analysis and next-step guidance",
    "- Clarifying question naming one exact UI block to copy",
    "- ONE Apply JSON block when evidence is sufficient (see APPLY_CONTRACT)",
    "",
    formatContextIndex(contextBlocks),
    "",
    "APPLY_CONTRACT",
    NETWORK_AI_BLOCK_REQUEST,
    "",
    AI_BEHAVIOR_CONTRACT,
    "",
    "SESSION START",
    "After reading Mechanics, greet with record state awareness and ask what the human wants — or request the next exact context block if work already requires it.",
  ].join("\n");
}

export function buildNetworkRequestPrompt(input: {
  state: NetworkRecordState;
  contextBlocks: NetworkContextBlockDef[];
}): string {
  const { state, contextBlocks } = input;
  const labels = contextBlocks.map((b) => `"${b.label}"`).join(", ");
  const who = state.person_name
    ? `Person: ${state.person_name}\nentityId: ${state.person_id}`
    : "Scope: Network desk (no person selected)";

  return [
    "=== ARGUS NETWORK REQUEST ===",
    "",
    who,
    "",
    formatRecordState(state),
    "",
    "=== REQUEST ===",
    "This is the universal Network work prompt. Use it to:",
    "- create or update a contact",
    "- capture a conversation",
    "- analyze a relationship",
    "- build a networking plan",
    "- assess available information / identify gaps",
    "- produce final Apply JSON when ready",
    "",
    "Rules:",
    "- Read Network Mechanics first in this AI session (copy button: Network Mechanics).",
    "- Use AVAILABLE_CONTEXT_BLOCKS from Mechanics; request missing blocks by exact UI label.",
    `- Labels available here: ${labels}`,
    "- Decide create vs update from CURRENT_RECORD_STATE — do not guess from the name alone.",
    "- Never invent facts. If evidence is missing, stop and ask for one labeled block.",
    "- Produce Apply JSON only when sufficient evidence exists; then say you are ready to finish.",
    "- Human applies JSON in Network Panel → Apply.",
    "",
    "APPLY_CONTRACT (reminder)",
    NETWORK_AI_BLOCK_REQUEST,
    "",
    "Human task (fill or discuss):",
    "(state what you want to do with this Network contact or desk)",
  ].join("\n");
}

export function buildNetworkContactPanelPackage(page: NetworkContactPageData): NetworkPanelPackage {
  const state = buildNetworkPersonRecordState(page);
  const contact = personContactBlock(page);
  const charter = charterBlock();
  const contextBlocks = [contact, charter];

  const mechanicsText = wrapSnapshotText(
    "Network Mechanics",
    buildNetworkMechanicsPrompt({
      state,
      contextBlocks,
      focusLine: `Current person: ${page.entity.name} (${page.entity.id})`,
    })
  );
  const requestText = wrapSnapshotText(
    "Network Request",
    buildNetworkRequestPrompt({ state, contextBlocks })
  );

  return {
    mechanics: {
      id: "network-mechanics",
      label: "Network Mechanics",
      description: "Give the AI the Network rules, capabilities and context index.",
      text: mechanicsText,
    },
    request: {
      id: "network-request",
      label: "Request",
      description: "Start or continue any Network task.",
      text: requestText,
    },
    additional: contextBlocks.map(toMenuItem),
    defaultEntityId: page.entity.id,
    panelTitle: page.entity.name,
  };
}

export function buildNetworkBrowsePanelPackage(input: {
  cards: V2NetworkBrowseCard[];
  summary: V2NetworkBrowseSummary;
  insights: V2NetworkBrowseInsight;
}): NetworkPanelPackage {
  const state = buildNetworkDeskRecordState(input.summary);
  const desk = deskSnapshotBlock(input);
  const charter = charterBlock();
  const contextBlocks = [desk, charter];

  return {
    mechanics: {
      id: "network-mechanics",
      label: "Network Mechanics",
      description: "Give the AI the Network rules, capabilities and context index.",
      text: wrapSnapshotText(
        "Network Mechanics",
        buildNetworkMechanicsPrompt({
          state,
          contextBlocks,
          focusLine: "Network desk — no person selected.",
        })
      ),
    },
    request: {
      id: "network-request",
      label: "Request",
      description: "Start or continue any Network task.",
      text: wrapSnapshotText(
        "Network Request",
        buildNetworkRequestPrompt({ state, contextBlocks })
      ),
    },
    additional: contextBlocks.map(toMenuItem),
    panelTitle: "Network desk",
  };
}
