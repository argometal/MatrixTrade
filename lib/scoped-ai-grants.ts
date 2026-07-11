import { randomBytes } from "crypto";
import {
  parseTradingInboxPayload,
  validateProposalPayload,
  type TradingInboxPayload,
} from "./bridge";
import {
  BOOTSTRAP_AI_ALLOWED_PROPOSAL_TYPES,
  isBootstrapGrant,
  SCOPED_AI_ALLOWED_PROPOSAL_TYPES,
  SCOPED_AI_DEFAULT_TTL_HOURS,
  type ScopedAiGrant,
  type ScopedAiGrantScope,
} from "./scoped-ai-grant-types";
import {
  getScopedAiGrantById,
  upsertScopedAiGrant,
} from "./scoped-ai-grants-store";
import { getPlanById } from "./plans";
import { getStockThesisById } from "./stock-theses";

export function newScopedGrantId(): string {
  return `GRANT-${randomBytes(12).toString("hex")}`;
}

export async function createScopedAiGrant(input: {
  stockProfileId: string;
  planId?: string;
  ttlHours?: number;
  scopes?: ScopedAiGrantScope[];
  label?: string;
}): Promise<{ grant?: ScopedAiGrant; errors?: string[] }> {
  const stockProfileId = input.stockProfileId.trim().toUpperCase();
  const profile = await getStockThesisById(stockProfileId);
  if (!profile) return { errors: ["Stock profile not found."] };

  let planId: string | undefined;
  if (input.planId?.trim()) {
    const plan = await getPlanById(input.planId.trim());
    if (!plan) return { errors: ["Plan not found."] };
    if (plan.stockThesisId !== stockProfileId) {
      return { errors: ["Plan must belong to the granted stock profile."] };
    }
    planId = plan.id;
  }

  const ttlHours = input.ttlHours ?? SCOPED_AI_DEFAULT_TTL_HOURS;
  const now = Date.now();
  const grant: ScopedAiGrant = {
    id: newScopedGrantId(),
    stockProfileId,
    ticker: profile.ticker,
    planId,
    scopes: input.scopes ?? ["read", "propose"],
    expiresAt: new Date(now + ttlHours * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(now).toISOString(),
    label: input.label?.trim() || undefined,
  };

  await upsertScopedAiGrant(grant);
  return { grant };
}

export async function createBootstrapAiGrant(input?: {
  ttlHours?: number;
  label?: string;
}): Promise<{ grant?: ScopedAiGrant; errors?: string[] }> {
  const ttlHours = input?.ttlHours ?? SCOPED_AI_DEFAULT_TTL_HOURS;
  const now = Date.now();
  const grant: ScopedAiGrant = {
    id: newScopedGrantId(),
    kind: "bootstrap",
    stockProfileId: "BOOTSTRAP",
    ticker: "*",
    scopes: ["read", "propose"],
    expiresAt: new Date(now + ttlHours * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(now).toISOString(),
    label: input?.label?.trim() || "New stock case",
  };
  await upsertScopedAiGrant(grant);
  return { grant };
}

export type ScopedGrantValidation =
  | { ok: true; grant: ScopedAiGrant }
  | { ok: false; error: string; status: 401 | 403 | 404 };

export async function validateScopedAiGrant(
  grantId: string,
  requiredScope: ScopedAiGrantScope
): Promise<ScopedGrantValidation> {
  const grant = await getScopedAiGrantById(grantId.trim());
  if (!grant) return { ok: false, error: "Grant not found.", status: 404 };

  if (Date.parse(grant.expiresAt) < Date.now()) {
    return { ok: false, error: "Grant expired.", status: 401 };
  }

  if (!grant.scopes.includes(requiredScope)) {
    return { ok: false, error: `Grant missing scope: ${requiredScope}`, status: 403 };
  }

  return { ok: true, grant };
}

export function scopedGrantTargetsProfile(
  grant: ScopedAiGrant,
  stockProfileId: string,
  ticker?: string
): boolean {
  if (grant.stockProfileId !== stockProfileId.trim().toUpperCase()) return false;
  if (ticker && grant.ticker !== ticker.trim().toUpperCase()) return false;
  return true;
}

export function buildScopedAiUrls(grantId: string, baseUrl?: string): {
  contextUrl: string;
  inboxUrl: string;
  humanPageUrl: string;
} {
  const origin =
    baseUrl?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL?.trim()
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  const base = origin.replace(/\/$/, "");
  return {
    contextUrl: `${base}/api/matrix/scout/${grantId}`,
    inboxUrl: `${base}/api/matrix/scout/${grantId}/inbox`,
    humanPageUrl: `${base}/scout-access/${grantId}`,
  };
}

export function validateScopedProposal(
  grant: ScopedAiGrant,
  body: Record<string, unknown>
): { ok: true; payload: TradingInboxPayload } | { ok: false; errors: string[] } {
  const parsed = parseTradingInboxPayload(body);
  if (!parsed) {
    return { ok: false, errors: ["Invalid payload. Expected type + proposal object."] };
  }

  const errors: string[] = [];
  const allowed = isBootstrapGrant(grant)
    ? BOOTSTRAP_AI_ALLOWED_PROPOSAL_TYPES
    : SCOPED_AI_ALLOWED_PROPOSAL_TYPES;

  if (!(allowed as readonly string[]).includes(parsed.type)) {
    errors.push(
      `Type "${parsed.type}" not allowed. Allowed: ${allowed.join(", ")}`
    );
  }

  const p = parsed.proposal;
  if (isBootstrapGrant(grant)) {
    if (parsed.type !== "stock-case-create") {
      errors.push("Bootstrap grants only accept stock-case-create.");
    }
  } else if (parsed.type === "evidence-add") {
    if (!scopedGrantTargetsProfile(grant, String(p.stockProfileId ?? ""), String(p.ticker ?? ""))) {
      errors.push("evidence-add must target the granted stock profile and ticker only.");
    }
  } else if (parsed.type === "file-update") {
    if (!scopedGrantTargetsProfile(grant, String(p.id ?? ""))) {
      errors.push("file-update must target the granted stock profile only.");
    }
  } else if (parsed.type === "scout-assessment") {
    if (!scopedGrantTargetsProfile(grant, String(p.stockFileId ?? ""), String(p.ticker ?? ""))) {
      errors.push("scout-assessment must target the granted stock profile and ticker only.");
    }
  } else if (parsed.type === "decision-update") {
    const planId = String(p.planId ?? "").trim().toUpperCase();
    if (!planId) {
      errors.push("decision-update requires proposal.planId.");
    } else if (grant.planId && grant.planId !== planId) {
      errors.push(`decision-update must target grant plan ${grant.planId}.`);
    }
  } else if (parsed.type === "layered-entry-update") {
    const planId = String(p.planId ?? "").trim().toUpperCase();
    if (!planId) {
      errors.push("layered-entry-update requires proposal.planId.");
    } else if (grant.planId && grant.planId !== planId) {
      errors.push(`layered-entry-update must target grant plan ${grant.planId}.`);
    }
  }

  const validation = validateProposalPayload(parsed);
  if (!validation.ok) errors.push(...validation.errors);

  return errors.length
    ? { ok: false, errors }
    : { ok: true, payload: parsed };
}

export async function validateScopedProposalAsync(
  grant: ScopedAiGrant,
  body: Record<string, unknown>
): Promise<{ ok: true; payload: TradingInboxPayload } | { ok: false; errors: string[] }> {
  const base = validateScopedProposal(grant, body);
  if (!base.ok) return base;

  if (base.payload.type === "decision-update" || base.payload.type === "layered-entry-update") {
    const planId = String(base.payload.proposal.planId ?? "").trim().toUpperCase();
    const plan = await getPlanById(planId);
    if (!plan) {
      return { ok: false, errors: [`Plan ${planId} not found.`] };
    }
    if (plan.stockThesisId && plan.stockThesisId !== grant.stockProfileId) {
      return {
        ok: false,
        errors: [`${base.payload.type} plan must belong to the granted stock profile.`],
      };
    }
  }

  return base;
}
