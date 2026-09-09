export type PlanCaseLifecycleStatus =
  | "INCOMPLETE"
  | "COMPLETE";

export type PlanCaseLifecycleRequirementState =
  | "COMPLETE"
  | "MISSING"
  | "N/A"
  | "INDETERMINATE"
  | "OPEN";

export type PlanCaseLifecycleRequirementKey =
  | "t0"
  | "validity"
  | "reality"
  | "execution"
  | "outcome"
  | "classification"
  | "learning"
  | "correctability"
  | "maf";

export type PlanCaseLifecycleRequirement = {
  key: PlanCaseLifecycleRequirementKey;
  label: string;
  state: PlanCaseLifecycleRequirementState;
  note?: string | null;
};

export type PlanCaseLifecycle = {
  status: PlanCaseLifecycleStatus;
  summary: string;
  evaluativeCompleteness: "COMPLETE" | "INCOMPLETE";
  blockingLabels: string[];
  requirements: PlanCaseLifecycleRequirement[];
};

export type DerivePlanCaseLifecycleInput = {
  caseOrigin: "modern" | "historical_trade";
  planStatus?: string | null;
  t0Available: boolean;
  hasValidityWindow: boolean;
  hasReality: boolean;
  hasExecutionEvidence: boolean;
  hasOutcomeEvidence: boolean;
  classificationComplete: boolean;
  hasLearningEvidence: boolean;
  hasAcceptedMaf: boolean;
  rrCorrectableIssue: boolean;
  rrIssueNote?: string | null;
};

function requirement(
  key: PlanCaseLifecycleRequirementKey,
  label: string,
  state: PlanCaseLifecycleRequirementState,
  note?: string | null
): PlanCaseLifecycleRequirement {
  return { key, label, state, note: note ?? null };
}

function isTerminalPlanStatus(planStatus?: string | null): boolean {
  return (
    planStatus === "entered" ||
    planStatus === "skipped" ||
    planStatus === "failed" ||
    planStatus === "expired"
  );
}

function blockingRequirements(
  requirements: PlanCaseLifecycleRequirement[]
): PlanCaseLifecycleRequirement[] {
  return requirements.filter(
    (item) => item.state === "MISSING" || item.state === "INDETERMINATE"
  );
}

export function derivePlanCaseLifecycle(
  input: DerivePlanCaseLifecycleInput
): PlanCaseLifecycle {
  if (input.caseOrigin === "historical_trade") {
    const requirements = [
      requirement(
        "t0",
        "T0",
        "N/A",
        "Historical trade-backed Case; no plan-backed T0 is expected."
      ),
      requirement(
        "validity",
        "Validity",
        "N/A",
        "Historical trade-backed Case; no canonical Plan validity window exists."
      ),
      requirement(
        "reality",
        "Reality",
        input.hasReality ? "COMPLETE" : "MISSING",
        input.hasReality ? "Observed trade path is available." : "Historical Reality evidence is missing."
      ),
      requirement(
        "execution",
        "Execution",
        input.hasExecutionEvidence ? "COMPLETE" : "MISSING",
        input.hasExecutionEvidence
          ? "Trade-backed execution evidence is linked."
          : "Historical Case is missing linked execution evidence."
      ),
      requirement(
        "outcome",
        "Outcome / Accounting",
        input.hasOutcomeEvidence ? "COMPLETE" : "MISSING",
        input.hasOutcomeEvidence
          ? "Historical accounting evidence is available."
          : "Historical accounting evidence is incomplete."
      ),
      requirement(
        "classification",
        "Classification",
        "N/A",
        "Historical Cases remain supported without fabricating plan-equation classification."
      ),
      requirement(
        "learning",
        "Learning Evidence",
        input.hasLearningEvidence ? "COMPLETE" : "N/A",
        input.hasLearningEvidence
          ? "Learning linkage exists."
          : "Learning linkage is complementary, not required for analysis."
      ),
      requirement(
        "correctability",
        "Correctability",
        "N/A",
        "No plan-backed geometry correction path applies."
      ),
      requirement("maf", "MAF", input.hasAcceptedMaf ? "COMPLETE" : "N/A")
    ];

    const blockers = blockingRequirements(requirements);
    return {
      status: blockers.length === 0 ? "COMPLETE" : "INCOMPLETE",
      summary:
        blockers.length === 0
          ? "Sufficient required information is present to analyze this Case."
          : `INCOMPLETE because required information is missing: ${blockers.map((item) => item.label).join(", ")}.`,
      evaluativeCompleteness: blockers.length === 0 ? "COMPLETE" : "INCOMPLETE",
      blockingLabels: blockers.map((item) => item.label),
      requirements,
    };
  }

  const requirements = [
    requirement(
      "t0",
      "T0",
      input.t0Available ? "COMPLETE" : "MISSING",
      input.t0Available
        ? "Decision-time evidence is preserved for this Plan/Case."
        : "Decision-time evidence is missing."
    ),
    requirement(
      "reality",
      "Reality",
      input.hasReality ? "COMPLETE" : "MISSING",
      input.hasReality
        ? "Observed path is available for evaluation."
        : "Reality evidence is missing."
    ),
    requirement(
      "execution",
      "Execution / Non-execution",
      input.hasExecutionEvidence ? "COMPLETE" : "MISSING",
      input.hasExecutionEvidence
        ? "Execution or legitimate non-execution is known."
        : "Execution / non-execution evidence is missing."
    ),
    requirement(
      "outcome",
      "Outcome / Accounting",
      input.hasOutcomeEvidence ? "COMPLETE" : "MISSING",
      input.hasOutcomeEvidence
        ? "Outcome and accounting evidence are available."
        : "Outcome / accounting evidence is missing."
    ),
    requirement(
      "learning",
      "Learning Evidence",
      input.hasLearningEvidence ? "COMPLETE" : "N/A",
      input.hasLearningEvidence
        ? "Learning linkage exists."
        : "Learning linkage is complementary, not required for analysis."
    ),
    requirement(
      "correctability",
      "Correctability",
      input.rrCorrectableIssue ? "N/A" : "N/A",
      input.rrCorrectableIssue
        ? input.rrIssueNote ??
            "Correctability may still be useful, but it does not determine whether the Case can be analyzed."
        : "Correctability is not a lifecycle requirement."
    ),
    requirement("maf", "MAF", input.hasAcceptedMaf ? "COMPLETE" : "N/A")
  ];

  const blockers = blockingRequirements(
    requirements.filter((item) =>
      item.key === "learning" || item.key === "correctability" || item.key === "maf"
        ? false
        : true
    )
  );

  return {
    status: blockers.length === 0 ? "COMPLETE" : "INCOMPLETE",
    summary:
      blockers.length === 0
        ? "Sufficient required information is present to analyze this Case."
        : `INCOMPLETE because required information is missing: ${blockers.map((item) => item.label).join(", ")}.`,
    evaluativeCompleteness: blockers.length === 0 ? "COMPLETE" : "INCOMPLETE",
    blockingLabels: blockers.map((item) => item.label),
    requirements,
  };
}
