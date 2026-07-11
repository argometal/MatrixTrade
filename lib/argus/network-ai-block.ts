import { normalizeAiBlockJson } from "@/lib/normalize-ai-block-json";
import {
  CONTACT_VALUE_KEYS,
  MY_VALUE_KEYS,
  normalizeContactValueKeys,
  normalizeMyValueKeys,
} from "./network-relationship-metrics";

export const NETWORK_AI_BLOCK_TYPES = [
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
Block types (Apply ready — human must click Apply in Argus):
- network-register: append journal log — entityId (required), title, body required; optional topics[]
- network-follow-up: follow_up log — entityId (required), title, body, followUpDate (YYYY-MM-DD) required
- network-tags: update linkedTags on person — entityId (required), tags[] (min 1) required
- network-analysis: append note log only (no entity mutation) — entityId (required), body required; optional title
- network-metrics: update contactValue / myValue arrays — entityId (required); at least one of contactValue[], myValue[]

Rules:
- Return exactly one block. No arrays of blocks.
- Do not apply changes — human imports in Network → Apply.
- entityId must match a person in the snapshot context.
- If context is insufficient, ask ONE clarifying question.`;

function isBlockType(value: unknown): value is NetworkAiBlockType {
  return typeof value === "string" && (NETWORK_AI_BLOCK_TYPES as readonly string[]).includes(value);
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
  if (!entityId) errors.push("proposal.entityId is required");

  switch (type) {
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
  const lines = [`Type: ${type}`, `Person: ${str(proposal.entityId)}`];
  switch (type) {
    case "network-register":
    case "network-follow-up":
    case "network-analysis":
      lines.push(`Title: ${str(proposal.title) || "(auto)"}`);
      lines.push(`Body: ${str(proposal.body).slice(0, 200)}${str(proposal.body).length > 200 ? "…" : ""}`);
      if (type === "network-follow-up") lines.push(`Follow-up: ${str(proposal.followUpDate)}`);
      if (type === "network-register" && strArray(proposal.topics).length) {
        lines.push(`Topics: ${strArray(proposal.topics).join(", ")}`);
      }
      break;
    case "network-tags":
      lines.push(`Tags: ${strArray(proposal.tags).join(", ")}`);
      break;
    case "network-metrics":
      if (strArray(proposal.contactValue).length) {
        lines.push(`Contact value: ${normalizeContactValueKeys(strArray(proposal.contactValue)).join(", ")}`);
      }
      if (strArray(proposal.myValue).length) {
        lines.push(`My value: ${normalizeMyValueKeys(strArray(proposal.myValue)).join(", ")}`);
      }
      break;
  }
  return lines.join("\n");
}

export const NETWORK_AI_BLOCK_SAMPLE_OPTIONS = NETWORK_AI_BLOCK_TYPES.map((type) => ({
  type,
  label: type,
  hint: type.replace("network-", ""),
}));

const SAMPLE_BLOCKS: Record<NetworkAiBlockType, NetworkAiBlockPayload> = {
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
