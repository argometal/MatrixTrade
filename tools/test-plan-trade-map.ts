import assert from "node:assert/strict";
import {
  deriveTradeMapIntent,
  deriveTradeMapNodes,
  deriveTradeMapWarnings,
  normalizeTradeMapY,
  type PlanLevelsView,
} from "../lib/plan-levels-board";
import type { LayeredEntryPlan } from "../lib/layered-entry-types";

const layered: LayeredEntryPlan = {
  executionMethod: "layered_limits",
  noChase: true,
  status: "planned",
  primaryTargetPrice: 270,
  commonStopPrice: 224,
  limits: [
    {
      price: 240,
      allocationPercent: 20,
      role: "starter",
      derived: {
        rr: 3,
        riskPerShare: 10,
        rewardPerShare: 30,
        riskSharePercent: 20,
        plannedQuantity: 2,
        plannedCapital: 480,
        plannedRiskAmount: 20,
      },
    },
    { price: 233, allocationPercent: 45, role: "preferred_pullback" },
    { price: 228, allocationPercent: 35, role: "deep_pullback" },
  ],
};

const view: PlanLevelsView = {
  ticker: "TEST",
  strategy: "Bull Trend Continuation",
  source: "plan",
  rows: [
    { kind: "target", label: "Primary target", value: "$270.00", emphasis: "success" },
    { kind: "limit", label: "Starter", value: "$240.00", emphasis: "primary" },
    { kind: "stop", label: "Common stop", value: "$224.00", emphasis: "danger" },
  ],
  plannedRR: 3.5,
  minRR: 4,
  currentPrice: 245.1,
  layeredEntry: {
    plan: layered,
    scenarios: [],
    highestLimit: 240,
  },
};

const nodes = deriveTradeMapNodes(view);
assert.ok(nodes.some((n) => n.kind === "target" && n.price === 270));
assert.ok(nodes.some((n) => n.kind === "stop" && n.price === 224));
assert.ok(nodes.some((n) => n.kind === "current" && n.price === 245.1));
assert.ok(nodes.filter((n) => n.kind === "entry").length === 3);
// High prices first
assert.ok(nodes[0].price >= nodes[nodes.length - 1].price);

const y270 = normalizeTradeMapY(270, 270, 224);
const y224 = normalizeTradeMapY(224, 270, 224);
assert.equal(y270, 0);
assert.equal(y224, 100);
assert.ok(normalizeTradeMapY(247, 270, 224) > 0 && normalizeTradeMapY(247, 270, 224) < 100);

const intent = deriveTradeMapIntent(view);
assert.ok(intent.some((s) => s.label.toLowerCase().includes("starter")));
assert.ok(intent[intent.length - 1].label.includes("Target"));

const warnings = deriveTradeMapWarnings(view);
assert.ok(warnings.some((w) => /below minimum R/i.test(w)));
assert.ok(warnings.some((w) => /above highest limit/i.test(w)));

// No current price → omit
const noCurrent = deriveTradeMapNodes({ ...view, currentPrice: undefined });
assert.ok(!noCurrent.some((n) => n.kind === "current"));

console.log("test-plan-trade-map: ok");
