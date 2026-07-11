import { buildAiContextPackage } from "./ai-context";
import { formatDecisionSection } from "./scout-decision";
import { formatProbeSection } from "./scout-probe";
import {
  ensureProfileEvidenceSeeded,
  formatMarketEvidenceSection,
  getActiveEvidenceForProfile,
} from "./market-evidence";
import { getPlans } from "./plans";
import { getPlaybooks } from "./playbooks";
import { getMonthlyRisk, getExperiment } from "./storage";
import {
  buildStockProfileSynthesis,
  formatSynthesisSection,
} from "./stock-profile-synthesis";
import { getStockThesisById } from "./stock-theses";
import type { ScopedAiGrant } from "./scoped-ai-grant-types";
import { isBootstrapGrant } from "./scoped-ai-grant-types";
import { loadBootstrapCreateContext } from "./load-bootstrap-create-context";

const SCOPED_AI_REQUEST = `Return ONE AI Block only — plain JSON or a single \`\`\`json fenced block.
SCOPED ACCESS — you may ONLY act on the stock profile in this package.

Allowed types:
- evidence-add: stockProfileId, ticker, timeframe, category, value, confidence required
- file-update: id (stock profile), at least one of status, currentHypothesis, notes, thesis
- decision-update: planId, verdict (go|wait|probe|no), decisionConfidence, challenges[] required; optional thesisQuality, opportunityQuality, confirmationCost (supplied prices only), locationEvidence, confirmationEvidence, singleEntryOnly, reasoning, planningRisk{}, executionRisk{}, probe{} when verdict=probe
- scout-assessment: stockProfileId, ticker, verdict (go|wait|no|probe), reasons[], challengesToThesis[]

Forbidden: trade-proposal, trade-close, playbook changes, other tickers.
Submit proposals via POST to the inboxUrl in meta — human Apply required.`;

export async function loadScopedScoutContext(grant: ScopedAiGrant): Promise<{
  text: string;
  meta: Record<string, unknown>;
}> {
  if (isBootstrapGrant(grant)) {
    return loadBootstrapCreateContext(grant);
  }

  await ensureProfileEvidenceSeeded(grant.stockProfileId);

  const [profile, evidence, plans, playbooks, monthly, experiment] = await Promise.all([
    getStockThesisById(grant.stockProfileId),
    getActiveEvidenceForProfile(grant.stockProfileId),
    getPlans(),
    getPlaybooks(),
    getMonthlyRisk(),
    getExperiment(),
  ]);

  if (!profile) {
    throw new Error("Stock profile not found.");
  }

  const synthesis = buildStockProfileSynthesis(profile, evidence);
  const tickerPlans = plans.filter((p) => p.stockThesisId === profile.id);
  const focusPlan = grant.planId
    ? tickerPlans.find((p) => p.id === grant.planId)
    : tickerPlans.find((p) => p.status === "watching" || p.status === "ready");

  const body = buildAiContextPackage({
    scope: "scouting-ticker",
    focusThesis: profile,
    plans: grant.planId && focusPlan ? [focusPlan] : tickerPlans,
    playbooks,
    monthly,
    experiment,
  });

  const decisionProbeSections: string[] = [];
  if (focusPlan) {
    const decisionSection = formatDecisionSection(focusPlan);
    if (decisionSection) decisionProbeSections.push(decisionSection);
    const probeSection = formatProbeSection(focusPlan);
    if (probeSection) decisionProbeSections.push(probeSection);
  }

  const text = [
    body,
    "",
    formatSynthesisSection(synthesis),
    "",
    formatMarketEvidenceSection(evidence),
    ...(decisionProbeSections.length ? ["", ...decisionProbeSections] : []),
    "",
    "=== SCOPED AI ACCESS ===",
    `grant_id:${grant.id}`,
    `stock_profile_id:${grant.stockProfileId}`,
    `ticker:${grant.ticker}`,
    grant.planId ? `plan_id:${grant.planId}` : "plan_id:unbound",
    `expires_at:${grant.expiresAt}`,
    `scopes:${grant.scopes.join(",")}`,
    "",
    "=== REQUEST ===",
    SCOPED_AI_REQUEST,
  ].join("\n");

  const { buildScopedAiUrls } = await import("./scoped-ai-grants");
  const urls = buildScopedAiUrls(grant.id);

  return {
    text,
    meta: {
      grantId: grant.id,
      stockProfileId: grant.stockProfileId,
      ticker: grant.ticker,
      expiresAt: grant.expiresAt,
      thesisConfidence: synthesis.thesisConfidence,
      evidenceCount: evidence.length,
      contextUrl: urls.contextUrl,
      inboxUrl: urls.inboxUrl,
      humanPageUrl: urls.humanPageUrl,
      allowedProposalTypes: ["evidence-add", "file-update", "scout-assessment", "decision-update"],
      planId: grant.planId ?? focusPlan?.id ?? null,
      scoutLifecycle: focusPlan?.scoutLifecycle ?? null,
      decisionVerdict: focusPlan?.decision?.verdict ?? null,
      probeStatus: focusPlan?.probe?.status ?? null,
    },
  };
}
