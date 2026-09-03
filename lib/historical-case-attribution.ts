/**
 * Historical / pre-MXT Case attribution (MXT 017-P13).
 * Complements 016a — does NOT replace T0→Reality→diagnoseCase.
 * Never fabricates verified T0.
 */

import type { MafComponentId, MafExperiment, MafQualityBand } from "./maf-types";
import type { MistakeType, Trade } from "./types";
import { MAF_COMPONENT_LABELS } from "./maf-types";

/** Provenance — reconstructed must never display as verified T0. */
export type HistoricalEvidenceProvenance =
  | "contemporaneous"
  | "reconstructed"
  | "inferred"
  | "unavailable";

export type HistoricalEvidenceItem = {
  key: string;
  value: string;
  provenance: HistoricalEvidenceProvenance;
  note?: string;
};

export type HistoricalAttributionComponent = {
  component: MafComponentId;
  label: string;
  band: MafQualityBand;
  provenance: HistoricalEvidenceProvenance;
  evidenceRefs: string[];
  reasoning: string;
};

export type HistoricalCaseAttribution = {
  tradeId: string;
  ticker: string;
  /** Always false for fabricated freeze — historical path never creates T0. */
  fabricatedT0: false;
  t0Status: "absent_pre_mxt" | "absent" | "present_on_linked_plan";
  preMxt: boolean;
  components: HistoricalAttributionComponent[];
  evidence: HistoricalEvidenceItem[];
  unsupportedConclusions: string[];
  /** Short Insights summary — attribution, not Case family override. */
  summary: string;
  confidenceNote: string;
};

const MISTAKE_TO_COMPONENT: Partial<
  Record<MistakeType, { component: MafComponentId; band: MafQualityBand }>
> = {
  fomo: { component: "timing_quality", band: "failure" },
  chased: { component: "entry_quality", band: "failure" },
  oversized: { component: "capital_allocation_quality", band: "failure" },
  ignored_stop: { component: "stop_quality", band: "failure" },
  ignored_htf: { component: "thesis_quality", band: "weak" },
  revenge: { component: "trade_management_quality", band: "failure" },
};

export function isHistoricalTradeCandidate(trade: Trade): boolean {
  if (trade.status !== "closed") return false;
  if (trade.planHistoricallyAbsent === true) return true;
  if (!trade.planId?.trim()) return true;
  return false;
}

function realizedR(trade: Trade): number | null {
  if (trade.riskRewardActual != null && Number.isFinite(trade.riskRewardActual)) {
    return trade.riskRewardActual;
  }
  if (
    trade.exit == null ||
    !Number.isFinite(trade.entry) ||
    !Number.isFinite(trade.stop) ||
    trade.entry === trade.stop
  ) {
    return null;
  }
  const risk = Math.abs(trade.entry - trade.stop);
  if (risk <= 0) return null;
  const dir = trade.direction === "short" ? -1 : 1;
  return (dir * (trade.exit - trade.entry)) / risk;
}

/**
 * Build historical attribution from Trade review + optional MAF.
 * Does not invent Scout/Plan/T0 contemporaneous knowledge.
 */
export function buildHistoricalCaseAttribution(input: {
  trade: Trade;
  maf?: MafExperiment | null;
  /** Explicit human reconstruction note (not T0). */
  reconstructionNote?: string | null;
  stockThesisReconstructed?: boolean;
}): HistoricalCaseAttribution {
  const trade = input.trade;
  const preMxt =
    trade.planHistoricallyAbsent === true || !trade.planId?.trim();
  const evidence: HistoricalEvidenceItem[] = [];
  const components: HistoricalAttributionComponent[] = [];
  const unsupported: string[] = [
    "No contemporaneous Scout decision",
    "No contemporaneous Plan geometry freeze (T0)",
    "Later Stock File zones are not trade-time criteria unless contemporaneous evidence proves otherwise",
  ];

  evidence.push({
    key: "trade.id",
    value: trade.id,
    provenance: "contemporaneous",
  });
  evidence.push({
    key: "trade.ticker",
    value: trade.ticker,
    provenance: "contemporaneous",
  });
  evidence.push({
    key: "trade.entry",
    value: String(trade.entry),
    provenance: trade.datesReconstructed ? "reconstructed" : "contemporaneous",
  });
  evidence.push({
    key: "trade.stop",
    value: String(trade.stop),
    provenance: trade.datesReconstructed ? "reconstructed" : "contemporaneous",
  });
  if (trade.target != null) {
    evidence.push({
      key: "trade.target",
      value: String(trade.target),
      provenance: "contemporaneous",
    });
  }
  if (trade.exit != null) {
    evidence.push({
      key: "trade.exit",
      value: String(trade.exit),
      provenance: "contemporaneous",
    });
  }
  const r = realizedR(trade);
  if (r != null) {
    evidence.push({
      key: "realizedR",
      value: r.toFixed(2),
      provenance: "contemporaneous",
      note: "Computed from fill geometry — outcome, not Decision Quality",
    });
  }
  if (trade.riskRewardPlanned != null) {
    evidence.push({
      key: "plannedRR",
      value: String(trade.riskRewardPlanned),
      provenance: "contemporaneous",
    });
  }

  if (trade.qualityEntry != null) {
    evidence.push({
      key: "qualityEntry",
      value: String(trade.qualityEntry),
      provenance: "reconstructed",
      note: "Post-trade review score — not T0",
    });
    if (trade.qualityEntry <= 2) {
      components.push({
        component: "entry_quality",
        label: MAF_COMPONENT_LABELS.entry_quality,
        band: "failure",
        provenance: "reconstructed",
        evidenceRefs: ["trade.qualityEntry", "trade.review"],
        reasoning:
          "Post-trade review marked entry quality low. Supports Entry/Location weakness without claiming a Scout criterion existed.",
      });
    }
  }

  for (const m of trade.mistakes ?? []) {
    if (m === "none") continue;
    evidence.push({
      key: `mistake.${m}`,
      value: m,
      provenance: "reconstructed",
      note: "Trade review attribution",
    });
    const mapped = MISTAKE_TO_COMPONENT[m];
    if (mapped) {
      const existing = components.find((c) => c.component === mapped.component);
      if (!existing) {
        components.push({
          component: mapped.component,
          label: MAF_COMPONENT_LABELS[mapped.component],
          band: mapped.band,
          provenance: "reconstructed",
          evidenceRefs: [`trade.mistakes.${m}`],
          reasoning: `Review mistake "${m}" maps to ${mapped.component} — reconstructed, not contemporaneous T0.`,
        });
      }
    }
  }

  if (trade.lesson?.trim()) {
    evidence.push({
      key: "lesson",
      value: trade.lesson.trim(),
      provenance: "reconstructed",
    });
  }
  if (trade.actionItem?.trim()) {
    evidence.push({
      key: "actionItem",
      value: trade.actionItem.trim(),
      provenance: "reconstructed",
    });
  }

  if (trade.planHistoricallyAbsent) {
    evidence.push({
      key: "planHistoricallyAbsent",
      value: "true",
      provenance: "contemporaneous",
      note: "Documented absence of Scout Plan",
    });
  }
  if (trade.playbookHistoricallyAbsent) {
    evidence.push({
      key: "playbookHistoricallyAbsent",
      value: "true",
      provenance: "contemporaneous",
    });
  }

  if (input.stockThesisReconstructed) {
    evidence.push({
      key: "stockThesis",
      value: "[reconstructed]",
      provenance: "reconstructed",
      note: "Stock Thesis link marked reconstructed — not trade-time Scout freeze",
    });
  }

  if (input.reconstructionNote?.trim()) {
    evidence.push({
      key: "humanReconstruction",
      value: input.reconstructionNote.trim(),
      provenance: "reconstructed",
      note: "Human historical clarification — not contemporaneous T0",
    });
    // Location/structure language → zone/entry without claiming exact historical criterion
    const note = input.reconstructionNote.toLowerCase();
    if (
      note.includes("location") ||
      note.includes("structural") ||
      note.includes("zone") ||
      note.includes("swept")
    ) {
      if (!components.some((c) => c.component === "zone_quality")) {
        components.push({
          component: "zone_quality",
          label: MAF_COMPONENT_LABELS.zone_quality,
          band: "failure",
          provenance: "reconstructed",
          evidenceRefs: ["humanReconstruction"],
          reasoning:
            "Human reconstruction indicates entry was not near a sufficiently strong structural location. Does not claim later Stock File zones were known at trade time.",
        });
      }
    }
  }

  // MAF — attribution evidence only; join when present
  if (input.maf) {
    evidence.push({
      key: "maf.id",
      value: input.maf.id,
      provenance: "reconstructed",
      note: "MAF attribution evidence (not Case family authority)",
    });
    for (const attr of input.maf.attributions) {
      if (attr.classification === "not_applicable") continue;
      if (
        attr.classification === "failure" ||
        attr.classification === "weak" ||
        attr.classification === "inconclusive"
      ) {
        if (!components.some((c) => c.component === attr.component)) {
          components.push({
            component: attr.component,
            label: MAF_COMPONENT_LABELS[attr.component],
            band: attr.classification,
            provenance: "reconstructed",
            evidenceRefs: attr.evidenceRefs ?? [`maf.${attr.component}`],
            reasoning: attr.reasoning,
          });
        }
      }
    }
  }

  const entryOrZone = components.filter(
    (c) =>
      c.component === "entry_quality" || c.component === "zone_quality"
  );
  const summary =
    entryOrZone.length > 0
      ? `Historical attribution: Entry/Location weakness (${entryOrZone
          .map((c) => c.component)
          .join(", ")}) — provenance reconstructed/post-trade. 016a family remains INDETERMINATE without T0.`
      : components.length > 0
        ? `Historical attribution from review/MAF (${components.length} component(s)) — not verified T0 diagnosis.`
        : "Insufficient historical review evidence for component attribution; 016a remains INDETERMINATE without T0.";

  return {
    tradeId: trade.id,
    ticker: trade.ticker,
    fabricatedT0: false,
    t0Status: preMxt
      ? "absent_pre_mxt"
      : trade.planId
        ? "present_on_linked_plan"
        : "absent",
    preMxt,
    components,
    evidence,
    unsupportedConclusions: unsupported,
    summary,
    confidenceNote:
      "Reconstructed evidence must not be shown as verified T0. Outcome R does not rewrite Decision Quality.",
  };
}

/** Resolve MAF for a trade unambiguously (tradeId match only). */
export function resolveMafForTrade(
  tradeId: string,
  experiments: MafExperiment[]
): MafExperiment | null {
  const needle = tradeId.toUpperCase();
  const hits = experiments.filter(
    (e) => e.tradeId?.toUpperCase() === needle
  );
  return hits.length === 1 ? hits[0]! : null;
}
