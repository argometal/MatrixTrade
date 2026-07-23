/**
 * AI proposals — never auto-modify.
 * Always require user acceptance before applying to Registry / Argus relations / Chaos.
 */

export const AI_PROPOSAL_KINDS = [
  "segmentation",
  "synthesis",
  "entities",
  "relations",
  "titles",
  "classification",
] as const;

export type AiProposalKind = (typeof AI_PROPOSAL_KINDS)[number];

export type AiProposalStatus = "pending" | "accepted" | "rejected";

export type AiProposal = {
  id: string;
  kind: AiProposalKind;
  createdAt: string;
  /** Target Memory Entry / Chaos id when applicable. */
  targetId?: string;
  /** Opaque payload shaped by kind — validated at apply time later. */
  payload: unknown;
  status: AiProposalStatus;
  rationale?: string;
};

export function isPendingProposal(proposal: AiProposal): boolean {
  return proposal.status === "pending";
}

/** Apply gate — Phase 1 helper; real apply adapters come later. */
export function assertAccepted(proposal: AiProposal): void {
  if (proposal.status !== "accepted") {
    throw new Error(`AI proposal ${proposal.id} is ${proposal.status}; user acceptance required.`);
  }
}
