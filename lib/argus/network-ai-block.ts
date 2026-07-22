import { normalizeAiBlockJson } from "@/lib/normalize-ai-block-json";
import {
  CONTACT_VALUE_KEYS,
  MY_VALUE_KEYS,
  normalizeContactValueKeys,
  normalizeMyValueKeys,
} from "./network-relationship-metrics";

export const NETWORK_AI_PRIMARY_BLOCK_TYPES = [
  "network-create-person",
  "network-capture",
] as const;

export const NETWORK_AI_BLOCK_TYPES = [
  ...NETWORK_AI_PRIMARY_BLOCK_TYPES,
  "network-register",
  "network-follow-up",
  "network-tags",
  "network-analysis",
  "network-metrics",
] as const;

export type NetworkAiBlockType = (typeof NETWORK_AI_BLOCK_TYPES)[number];

export type NetworkAiBlockPayload = {
  type: NetworkAiBlockType;
  proposal: Record<string, unknown>;
};

export const NETWORK_AI_BLOCK_REQUEST = `Return ONE AI Block only — plain JSON or a single \`\`\`json fenced block.
Required shape:
{
  "type": "<block-type>",
  "proposal": { ... }
}

Primary block types (Network panel — human must click Apply):
- network-create-person: NEW contact from desk — name (required); optional role, organization, email, notes, tags[]
- network-capture: AFTER conversation on existing person — entityId (required), body (required); optional title, followUpDate (YYYY-MM-DD), tags[]

Legacy types (still supported):
- network-register: append journal log — entityId, title/body
- network-follow-up: follow_up log — entityId, body, followUpDate
- network-tags: merge linkedTags — entityId, tags[]
- network-analysis: note log only — entityId, body
- network-metrics: contactValue / myValue arrays — entityId

Rules:
- Return exactly one block. No arrays of blocks.
- Do not apply changes — human imports in Network Panel → Apply.
- For network-capture, entityId must match a person in the snapshot.
- If context is insufficient, name the exact Library UI label to copy next (from AVAILABLE_CONTEXT_BLOCKS), then stop. Do not invent.`;

function isBlockType(value: unknown): value is NetworkAiBlockType {
  return typeof value === "string" && (NETWORK_AI_BLOCK_TYPES as readonly string[]).includes(value);
}

function requiresEntityId(type: NetworkAiBlockType): boolean {
  return type !== "network-create-person";
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean);
}

export function extractJsonFromNetworkAiBlock(raw: string): string {
  return normalizeAiBlockJson(raw);
}

export function validateNetworkAiBlockProposal(
  type: NetworkAiBlockType,
  proposal: Record<string, unknown>
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const entityId = str(proposal.entityId);

  if (requiresEntityId(type) && !entityId) {
    errors.push("proposal.entityId is required");
  }

  switch (type) {
    case "network-create-person": {
      if (!str(proposal.name)) errors.push("network-create-person requires name");
      if (
        !str(proposal.role) &&
        !str(proposal.notes) &&
        !str(proposal.email) &&
        !str(proposal.organization)
      ) {
        errors.push("network-create-person needs at least one of role, organization, email, or notes");
      }
      break;
    }
    case "network-capture": {
      if (!str(proposal.body)) errors.push("network-capture requires body");
      const followUpDate = str(proposal.followUpDate).slice(0, 10);
      if (followUpDate && !/^\d{4}-\d{2}-\d{2}$/.test(followUpDate)) {
        errors.push("network-capture followUpDate must be YYYY-MM-DD when provided");
      }
      break;
    }
    case "network-register": {
      if (!str(proposal.title) && !str(proposal.body)) {
        errors.push("network-register requires title or body");
      }
      break;
    }
    case "network-follow-up": {
      if (!str(proposal.title) && !str(proposal.body)) {
        errors.push("network-follow-up requires title or body");
      }
      const followUpDate = str(proposal.followUpDate).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(followUpDate)) {
        errors.push("network-follow-up requires followUpDate (YYYY-MM-DD)");
      }
      break;
    }
    case "network-tags": {
      const tags = strArray(proposal.tags);
      if (tags.length === 0) errors.push("network-tags requires tags[] with at least one tag");
      break;
    }
    case "network-analysis": {
      if (!str(proposal.body)) errors.push("network-analysis requires body");
      break;
    }
    case "network-metrics": {
      const contactValue = normalizeContactValueKeys(strArray(proposal.contactValue));
      const myValue = normalizeMyValueKeys(strArray(proposal.myValue));
      if (contactValue.length === 0 && myValue.length === 0) {
        errors.push("network-metrics requires at least one of contactValue[] or myValue[]");
      }
      break;
    }
    default:
      errors.push(`Unknown block type: ${type}`);
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

export function parseNetworkAiBlock(raw: string):
  | { ok: true; payload: NetworkAiBlockPayload }
  | { ok: false; error: string; details?: string[] } {
  const jsonText = extractJsonFromNetworkAiBlock(raw);
  if (!jsonText) {
    return { ok: false, error: "AI Block is empty." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return {
      ok: false,
      error:
        "Invalid JSON. Paste plain JSON or a ```json fenced block. Tip: if the paste used curly quotes, re-ask your AI for ASCII JSON only.",
    };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "AI Block must be a JSON object with type and proposal." };
  }

  const body = parsed as Record<string, unknown>;
  const type = body.type;
  if (!isBlockType(type)) {
    return {
      ok: false,
      error: `Invalid type. Supported: ${NETWORK_AI_BLOCK_TYPES.join(", ")}`,
    };
  }

  const proposal = body.proposal;
  if (!proposal || typeof proposal !== "object" || Array.isArray(proposal)) {
    return { ok: false, error: "proposal must be a JSON object." };
  }

  const validation = validateNetworkAiBlockProposal(type, proposal as Record<string, unknown>);
  if (!validation.ok) {
    return { ok: false, error: "Validation failed", details: validation.errors };
  }

  return { ok: true, payload: { type, proposal: proposal as Record<string, unknown> } };
}

export function previewNetworkAiBlock(payload: NetworkAiBlockPayload): string {
  const { type, proposal } = payload;
  const lines = [`Type: ${type}`];

  switch (type) {
    case "network-create-person":
      lines.push(`Name: ${str(proposal.name)}`);
      if (str(proposal.role)) lines.push(`Role: ${str(proposal.role)}`);
      if (str(proposal.organization)) lines.push(`Organization: ${str(proposal.organization)}`);
      if (str(proposal.email)) lines.push(`Email: ${str(proposal.email)}`);
      if (str(proposal.notes)) {
        lines.push(`Notes: ${str(proposal.notes).slice(0, 200)}${str(proposal.notes).length > 200 ? "…" : ""}`);
      }
      if (strArray(proposal.tags).length) lines.push(`Tags: ${strArray(proposal.tags).join(", ")}`);
      break;
    case "network-capture":
      lines.push(`Person: ${str(proposal.entityId)}`);
      lines.push(`Title: ${str(proposal.title) || "(auto)"}`);
      lines.push(`Body: ${str(proposal.body).slice(0, 200)}${str(proposal.body).length > 200 ? "…" : ""}`);
      if (str(proposal.followUpDate)) lines.push(`Follow-up: ${str(proposal.followUpDate)}`);
      if (strArray(proposal.tags).length) lines.push(`Tags: ${strArray(proposal.tags).join(", ")}`);
      break;
    default:
      lines.push(`Person: ${str(proposal.entityId)}`);
      if (type === "network-register" || type === "network-follow-up" || type === "network-analysis") {
        lines.push(`Title: ${str(proposal.title) || "(auto)"}`);
        lines.push(`Body: ${str(proposal.body).slice(0, 200)}${str(proposal.body).length > 200 ? "…" : ""}`);
        if (type === "network-follow-up") lines.push(`Follow-up: ${str(proposal.followUpDate)}`);
      }
      if (type === "network-tags") lines.push(`Tags: ${strArray(proposal.tags).join(", ")}`);
      if (type === "network-metrics") {
        if (strArray(proposal.contactValue).length) {
          lines.push(`Contact value: ${normalizeContactValueKeys(strArray(proposal.contactValue)).join(", ")}`);
        }
        if (strArray(proposal.myValue).length) {
          lines.push(`My value: ${normalizeMyValueKeys(strArray(proposal.myValue)).join(", ")}`);
        }
      }
      break;
  }
  return lines.join("\n");
}

export const NETWORK_AI_BLOCK_SAMPLE_OPTIONS = [
  { type: "network-create-person" as const, label: "Create person", hint: "new contact" },
  { type: "network-capture" as const, label: "Capture conversation", hint: "after chat" },
  ...NETWORK_AI_BLOCK_TYPES.filter(
    (type) => type !== "network-create-person" && type !== "network-capture"
  ).map((type) => ({
    type,
    label: type,
    hint: type.replace("network-", ""),
  })),
];

const SAMPLE_BLOCKS: Record<NetworkAiBlockType, NetworkAiBlockPayload> = {
  "network-create-person": {
    type: "network-create-person",
    proposal: {
      name: "Jane Doe",
      role: "Drilling engineer",
      organization: "SLB",
      email: "jane.doe@example.com",
      notes: "Met at RIG RUN prejob — discussed BHA and permits.",
      tags: ["technical", "decision-maker"],
    },
  },
  "network-capture": {
    type: "network-capture",
    proposal: {
      entityId: "PERSON_ID",
      title: "RIG RUN prejob call",
      body: "Discussed BHA match, permits timeline, and follow-up on PD2 flows.",
      followUpDate: "2026-07-20",
      tags: ["gap", "follow-up"],
    },
  },
  "network-register": {
    type: "network-register",
    proposal: {
      entityId: "PERSON_ID",
      title: "Conversation notes",
      body: "Discussed industry trends and shared perspective on upcoming projects.",
      topics: ["networking", "industry-trends"],
    },
  },
  "network-follow-up": {
    type: "network-follow-up",
    proposal: {
      entityId: "PERSON_ID",
      title: "Follow up on intro",
      body: "Send the resource we discussed and check if intro would help.",
      followUpDate: "2026-07-18",
    },
  },
  "network-tags": {
    type: "network-tags",
    proposal: {
      entityId: "PERSON_ID",
      tags: ["technical-expert", "decision-maker"],
    },
  },
  "network-analysis": {
    type: "network-analysis",
    proposal: {
      entityId: "PERSON_ID",
      title: "Relationship pattern",
      body: "Third conversation this quarter — consistent focus on deepwater operations. Worth maintaining.",
    },
  },
  "network-metrics": {
    type: "network-metrics",
    proposal: {
      entityId: "PERSON_ID",
      contactValue: ["knowledge", "opportunity"],
      myValue: ["help", "connection"],
    },
  },
};

export function sampleNetworkAiBlock(type: NetworkAiBlockType): string {
  return JSON.stringify(SAMPLE_BLOCKS[type], null, 2);
}

export { CONTACT_VALUE_KEYS, MY_VALUE_KEYS };
