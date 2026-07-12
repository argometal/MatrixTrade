import { appendMarketEvidenceFromProposal } from "./market-evidence";
import { createStockCaseFromProposal } from "./stock-case-create";
import { deleteStockCaseFromProposal } from "./stock-case-delete";
import { getAppliedImportStore } from "./applied-import-store";
import { computeImportFingerprint } from "./import-fingerprint";
import { readNoteBody } from "./obsidian";
import { syncObsidianTradeIfLocal } from "./obsidian-local";
import type { Playbook } from "./playbook-types";
import {
  appendScoutAssessment,
  applyStockFileInboxUpdate,
} from "./stock-theses";
import {
  getPlaybookById,
  parsePlaybookChecklist,
  parsePlaybookStatus,
  slugifyPlaybookId,
  upsertPlaybook,
} from "./playbooks";
import { absoluteNotePath, enrichTrade } from "./trade-links";
import {
  parseMistakes,
  parseTradingInboxPayload,
  type TradingInboxPayload,
  type TradingProposalType,
} from "./bridge";
import { recordScoutDecisionFromProposal, recordLayeredEntryFromProposal } from "./plans";
import {
  parseTradeProposalStatus,
  validateTradeCloseProposal,
} from "./validation";
import {
  closeTrade,
  createTrade,
  getRules,
  getTradeById,
  saveTradeReview,
  updateTrade,
} from "./storage";
import { upsertTradeInJson } from "./trades-json";
import type { CreateTradeInput, SaveReviewInput, Trade, UpdateTradeInput } from "./types";

export type ApplyTradingProposalResult =
  | {
      ok: true;
      message: string;
      type: TradingProposalType;
      tradeId?: string;
      playbookId?: string;
      stockFileId?: string;
      planId?: string;
      trade?: Trade;
      playbook?: Playbook;
      alreadyApplied?: boolean;
    }
  | { ok: false; errors: string[] };

function resultFromAppliedRecord(
  record: { result: { message: string; type: string; tradeId?: string; playbookId?: string; stockFileId?: string; planId?: string } },
  type: TradingProposalType
): ApplyTradingProposalResult {
  return {
    ok: true,
    alreadyApplied: true,
    message: `Already applied. ${record.result.message}`,
    type,
    tradeId: record.result.tradeId,
    playbookId: record.result.playbookId,
    stockFileId: record.result.stockFileId,
    planId: record.result.planId,
  };
}

export async function applyTradingProposal(
  payload: Record<string, unknown>
): Promise<ApplyTradingProposalResult> {
  const parsed = parseTradingInboxPayload(payload);
  if (!parsed) {
    return { ok: false, errors: ["Invalid inbox payload shape."] };
  }

  const fingerprint = computeImportFingerprint(payload);
  const store = getAppliedImportStore();
  try {
    const existing = await store.findByFingerprint(fingerprint);
    if (existing) {
      return resultFromAppliedRecord(existing, parsed.type);
    }
  } catch {
    /* fingerprint store unavailable — proceed with apply */
  }

  const result = await applyTradingProposalInner(parsed);
  if (!result.ok) return result;

  try {
    await store.record(fingerprint, {
      message: result.message,
      type: result.type,
      tradeId: result.tradeId,
      playbookId: result.playbookId,
      stockFileId: result.stockFileId,
      planId: result.planId,
    });
  } catch {
    /* fingerprint audit best-effort — apply already succeeded */
  }
  return result;
}

async function applyTradingProposalInner(
  parsed: TradingInboxPayload
): Promise<ApplyTradingProposalResult> {
  switch (parsed.type) {
    case "stock-case-create":
      return applyStockCaseCreate(parsed);
    case "stock-case-delete":
      return applyStockCaseDelete(parsed);
    case "scout-assessment":
      return applyScoutAssessment(parsed);
    case "decision-update":
      return applyDecisionUpdate(parsed);
    case "layered-entry-update":
      return applyLayeredEntryUpdate(parsed);
    case "evidence-add":
      return applyEvidenceAdd(parsed);
    case "file-update":
      return applyFileUpdate(parsed);
    case "trade-proposal":
      return applyTradeProposal(parsed);
    case "trade-close":
      return applyTradeClose(parsed);
    case "trade-review":
      return applyTradeReview(parsed);
    case "analysis":
      return applyAnalysis(parsed);
    case "trade-update":
      return applyTradeUpdate(parsed);
    case "playbook-create":
      return applyPlaybookCreate(parsed);
    case "playbook-update":
      return applyPlaybookUpdate(parsed);
    default:
      return { ok: false, errors: ["Unsupported proposal type."] };
  }
}

async function applyStockCaseDelete(
  parsed: TradingInboxPayload
): Promise<ApplyTradingProposalResult> {
  const result = await deleteStockCaseFromProposal(parsed.proposal);
  if (result.errors?.length) return { ok: false, errors: result.errors };
  return {
    ok: true,
    message: `Deleted Stock Profile ${result.deletedId}`,
    type: "stock-case-delete",
    stockFileId: result.deletedId,
  };
}

async function applyStockCaseCreate(
  parsed: TradingInboxPayload
): Promise<ApplyTradingProposalResult> {
  const result = await createStockCaseFromProposal(parsed.proposal);
  if (result.errors?.length) return { ok: false, errors: result.errors };
  const parts = [
    `Created Stock Profile ${result.thesis?.id} · ${result.thesis?.ticker}`,
    result.evidenceSeeded ? `${result.evidenceSeeded} evidence rows` : null,
    result.planId ? `scout ${result.planId}` : null,
  ].filter(Boolean);
  return {
    ok: true,
    message: parts.join(" · "),
    type: "stock-case-create",
    stockFileId: result.thesis?.id,
    planId: result.planId,
  };
}

async function applyEvidenceAdd(
  parsed: TradingInboxPayload
): Promise<ApplyTradingProposalResult> {
  const result = await appendMarketEvidenceFromProposal(parsed.proposal);
  if (result.errors?.length) return { ok: false, errors: result.errors };
  return {
    ok: true,
    message: `Evidence appended · ${result.evidence?.id} (${result.evidence?.category})`,
    type: "evidence-add",
    stockFileId: result.evidence?.stockProfileId,
  };
}

async function applyScoutAssessment(
  parsed: TradingInboxPayload
): Promise<ApplyTradingProposalResult> {
  const p = parsed.proposal;
  const stockFileId = String(p.stockFileId).toUpperCase();
  const result = await appendScoutAssessment(stockFileId, p);
  if (result.errors?.length) return { ok: false, errors: result.errors };
  return {
    ok: true,
    message: `Scout assessment saved on ${stockFileId} · verdict ${p.verdict}`,
    type: "scout-assessment",
    stockFileId,
  };
}

async function applyDecisionUpdate(
  parsed: TradingInboxPayload
): Promise<ApplyTradingProposalResult> {
  const result = await recordScoutDecisionFromProposal(parsed.proposal);
  if (result.errors?.length) return { ok: false, errors: result.errors };
  const plan = result.plan!;
  const parts = [`Updated scout ${plan.id}`];
  if (plan.decision?.verdict) parts.push(`verdict ${plan.decision.verdict}`);
  if (plan.plannedEntry !== undefined) parts.push(`entry ${plan.plannedEntry}`);
  if (plan.stopPrice !== undefined) parts.push(`stop ${plan.stopPrice}`);
  if (plan.targetPrice !== undefined) parts.push(`target ${plan.targetPrice}`);
  return {
    ok: true,
    message: parts.join(" · "),
    type: "decision-update",
    planId: plan.id,
    stockFileId: plan.stockThesisId,
  };
}

async function applyLayeredEntryUpdate(
  parsed: TradingInboxPayload
): Promise<ApplyTradingProposalResult> {
  const result = await recordLayeredEntryFromProposal(parsed.proposal);
  if (result.errors?.length) return { ok: false, errors: result.errors };
  const plan = result.plan!;
  return {
    ok: true,
    message: `Layered entry updated on ${plan.id} · ${plan.layeredEntry?.status} · fill ${plan.layeredEntry?.fillPercent ?? 0}%`,
    type: "layered-entry-update",
    planId: plan.id,
    stockFileId: plan.stockThesisId,
  };
}

async function applyFileUpdate(
  parsed: TradingInboxPayload
): Promise<ApplyTradingProposalResult> {
  const id = String(parsed.proposal.id).toUpperCase();
  const result = await applyStockFileInboxUpdate(id, parsed.proposal);
  if (result.errors?.length) return { ok: false, errors: result.errors };
  const parts = [`Updated Stock File ${id}`];
  if (result.thesis && result.thesis.version) parts.push(`v${result.thesis.version}`);
  if (result.planId) parts.push(`backfilled scout ${result.planId}`);
  return {
    ok: true,
    message: parts.join(" · "),
    type: "file-update",
    stockFileId: id,
    planId: result.planId,
  };
}

async function applyTradeProposal(
  parsed: TradingInboxPayload
): Promise<ApplyTradingProposalResult> {
  const p = parsed.proposal;
  const status = parseTradeProposalStatus(p.status);
  if (!status) {
    return {
      ok: false,
      errors: ['proposal.status must be "pending" or "open".'],
    };
  }

  const input: CreateTradeInput = {
    id: String(p.id).toUpperCase(),
    ticker: String(p.ticker).toUpperCase(),
    entry: Number(p.entry),
    stop: Number(p.stop),
    shares: Number(p.shares),
    status,
  };
  if (p.target) input.target = Number(p.target);
  if (p.setupId) input.setupId = String(p.setupId);

  const result = await createTrade(input);
  if (result.errors?.length) return { ok: false, errors: result.errors };
  return {
    ok: true,
    message: `Created trade ${input.id} · ${input.ticker} (${input.status ?? "pending"})`,
    type: "trade-proposal",
    tradeId: input.id,
    trade: result.trade,
  };
}

async function applyTradeClose(
  parsed: TradingInboxPayload
): Promise<ApplyTradingProposalResult> {
  const id = String(parsed.proposal.id).toUpperCase();
  const exit = Number(parsed.proposal.exit);
  const trade = await getTradeById(id);
  const closeError = validateTradeCloseProposal(trade, parsed.proposal);
  if (closeError) {
    return { ok: false, errors: [closeError] };
  }

  const result = await closeTrade(id, { exit });
  if (result.errors?.length) return { ok: false, errors: result.errors };
  return {
    ok: true,
    message: `Closed trade ${id} at ${exit}`,
    type: "trade-close",
    tradeId: id,
    trade: result.trade,
  };
}

async function applyTradeReview(
  parsed: TradingInboxPayload
): Promise<ApplyTradingProposalResult> {
  const p = parsed.proposal;
  const id = String(p.id).toUpperCase();
  const input: SaveReviewInput = {
    mistakes: parseMistakes(p.mistakes),
    qualityEntry: Number(p.qualityEntry),
    qualityExit: Number(p.qualityExit),
    qualityMgmt: Number(p.qualityMgmt),
    lesson: p.lesson ? String(p.lesson) : undefined,
    actionItem: p.actionItem ? String(p.actionItem) : undefined,
  };

  const result = await saveTradeReview(id, input);
  if (result.errors?.length) return { ok: false, errors: result.errors };
  return {
    ok: true,
    message: `Saved review for ${id}`,
    type: "trade-review",
    tradeId: id,
    trade: result.trade,
  };
}

async function applyAnalysis(
  parsed: TradingInboxPayload
): Promise<ApplyTradingProposalResult> {
  const p = parsed.proposal;
  const id = String(p.id).toUpperCase();
  const trade = await getTradeById(id);
  if (!trade) return { ok: false, errors: ["Trade not found."] };

  const rules = await getRules();
  const notePath = absoluteNotePath(trade, rules);
  let body = "";
  try {
    body = await readNoteBody(notePath);
  } catch {
    body = "";
  }

  const blocks: string[] = [];
  if (p.thesis) blocks.push(`### Tesis (import)\n${String(p.thesis)}`);
  if (p.psychology) blocks.push(`### Psicología (import)\n${String(p.psychology)}`);
  if (p.lessons) blocks.push(`### Lecciones (import)\n${String(p.lessons)}`);
  if (p.notes) blocks.push(`### Notas (import)\n${String(p.notes)}`);

  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const appendix = `\n\n---\n\n## AI import · ${stamp}\n\n${blocks.join("\n\n")}\n`;
  const nextBody = `${body.trim()}${appendix}`;

  const updated = enrichTrade(
    {
      ...trade,
      thesis: p.thesis ? String(p.thesis) : trade.thesis,
      psychology: p.psychology ? String(p.psychology) : trade.psychology,
      lessons: p.lessons ? String(p.lessons) : trade.lessons,
      notes: p.notes
        ? [trade.notes, String(p.notes)].filter(Boolean).join("\n\n")
        : trade.notes,
    },
    rules
  );

  await upsertTradeInJson(updated);
  await syncObsidianTradeIfLocal(updated, rules, nextBody);

  return {
    ok: true,
    message: `Saved analysis for ${id} (trade store + Obsidian when local)`,
    type: "analysis",
    tradeId: id,
    trade: updated,
  };
}

function buildTradeUpdateInput(proposal: Record<string, unknown>): UpdateTradeInput {
  const input: UpdateTradeInput = {};
  if (proposal.ticker !== undefined) input.ticker = String(proposal.ticker);
  if (proposal.entry !== undefined) input.entry = Number(proposal.entry);
  if (proposal.exit !== undefined) input.exit = Number(proposal.exit);
  if (proposal.stop !== undefined) input.stop = Number(proposal.stop);
  if (proposal.target !== undefined) input.target = Number(proposal.target);
  if (proposal.shares !== undefined) input.shares = Number(proposal.shares);
  if (proposal.status !== undefined) input.status = String(proposal.status) as UpdateTradeInput["status"];
  if (proposal.thesis !== undefined) input.thesis = String(proposal.thesis);
  if (proposal.psychology !== undefined) input.psychology = String(proposal.psychology);
  if (proposal.lessons !== undefined) input.lessons = String(proposal.lessons);
  if (proposal.notes !== undefined) input.notes = String(proposal.notes);
  if (proposal.playbookId !== undefined) input.playbookId = String(proposal.playbookId);
  if (proposal.setupId !== undefined) input.setupId = String(proposal.setupId);
  if (proposal.planId !== undefined) input.planId = String(proposal.planId);
  if (proposal.closedAt !== undefined) input.closedAt = String(proposal.closedAt);
  if (proposal.plannedRisk !== undefined) input.plannedRisk = Number(proposal.plannedRisk);
  if (proposal.actualRisk !== undefined) input.actualRisk = Number(proposal.actualRisk);
  if (proposal.riskRewardPlanned !== undefined) {
    input.riskRewardPlanned = Number(proposal.riskRewardPlanned);
  }
  if (proposal.riskRewardActual !== undefined) {
    input.riskRewardActual = Number(proposal.riskRewardActual);
  }
  if (proposal.exitReason !== undefined) {
    input.exitReason = String(proposal.exitReason) as UpdateTradeInput["exitReason"];
  }
  if (proposal.lossClassification !== undefined) {
    input.lossClassification = String(proposal.lossClassification) as UpdateTradeInput["lossClassification"];
  }
  if (proposal.postStopStudy !== undefined) {
    input.postStopStudy = proposal.postStopStudy as UpdateTradeInput["postStopStudy"];
  }
  return input;
}

async function applyTradeUpdate(
  parsed: TradingInboxPayload
): Promise<ApplyTradingProposalResult> {
  const id = String(parsed.proposal.id).toUpperCase();
  const result = await updateTrade(id, buildTradeUpdateInput(parsed.proposal));
  if (result.errors?.length) return { ok: false, errors: result.errors };
  return {
    ok: true,
    message: `Updated trade ${id}`,
    type: "trade-update",
    tradeId: id,
    trade: result.trade,
  };
}

async function applyPlaybookCreate(
  parsed: TradingInboxPayload
): Promise<ApplyTradingProposalResult> {
  const p = parsed.proposal;
  const name = String(p.name).trim();
  const idRaw = p.id ? String(p.id).trim() : slugifyPlaybookId(name);
  const id = idRaw || slugifyPlaybookId(`playbook-${Date.now()}`);

  const existing = await getPlaybookById(id);
  if (existing) {
    return { ok: false, errors: [`Playbook id "${id}" already exists.`] };
  }

  const playbook: Playbook = {
    id,
    name,
    status: parsePlaybookStatus(p.status),
    description: p.description ? String(p.description) : "",
    checklist: parsePlaybookChecklist(p.checklist),
  };

  await upsertPlaybook(playbook);
  return {
    ok: true,
    message: `Created playbook ${playbook.id} · ${playbook.name}`,
    type: "playbook-create",
    playbookId: playbook.id,
    playbook,
  };
}

async function applyPlaybookUpdate(
  parsed: TradingInboxPayload
): Promise<ApplyTradingProposalResult> {
  const p = parsed.proposal;
  const id = String(p.id).trim();
  const existing = await getPlaybookById(id);
  if (!existing) {
    return { ok: false, errors: [`Playbook "${id}" not found.`] };
  }

  const updated: Playbook = {
    ...existing,
    name: p.name !== undefined ? String(p.name).trim() : existing.name,
    status: p.status !== undefined ? parsePlaybookStatus(p.status) : existing.status,
    description:
      p.description !== undefined ? String(p.description) : existing.description,
    checklist:
      p.checklist !== undefined ? parsePlaybookChecklist(p.checklist) : existing.checklist,
  };

  await upsertPlaybook(updated);
  return {
    ok: true,
    message: `Updated playbook ${updated.id} · ${updated.name}`,
    type: "playbook-update",
    playbookId: updated.id,
    playbook: updated,
  };
}
