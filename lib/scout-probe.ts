import type { TradePlan } from "./plan-types";
import {
  DEFAULT_PROBE_RISK_PERCENT,
  type Probe,
  type ProbeInput,
  type ProbeStatus,
} from "./scout-probe-types";

const VALID_TRANSITIONS: Record<ProbeStatus, ProbeStatus[]> = {
  authorized: ["active", "cancelled"],
  active: ["converted", "cancelled", "stopped"],
  converted: [],
  cancelled: [],
  stopped: [],
};

export function validateProbeTransition(
  from: ProbeStatus,
  to: ProbeStatus
): string | null {
  if (from === to) return null;
  if (!VALID_TRANSITIONS[from].includes(to)) {
    return `Probe cannot transition from ${from} to ${to}.`;
  }
  return null;
}

export function authorizeProbe(input: ProbeInput): Probe {
  return {
    enabled: true,
    allocationPercent: input.allocationPercent,
    riskPercent: input.riskPercent ?? DEFAULT_PROBE_RISK_PERCENT,
    shares: input.shares,
    stop: input.stop,
    reason: input.reason?.trim() || undefined,
    expires: input.expires || undefined,
    trigger: input.trigger?.trim() || undefined,
    status: "authorized",
  };
}

function applyProbeTransition(plan: TradePlan, to: ProbeStatus): {
  plan?: TradePlan;
  errors?: string[];
} {
  if (!plan.probe?.enabled) {
    return { errors: ["No probe on this scout."] };
  }
  const from = plan.probe.status;
  const transitionError = validateProbeTransition(from, to);
  if (transitionError) return { errors: [transitionError] };

  const now = new Date().toISOString();
  const probe: Probe = { ...plan.probe, status: to };
  if (to === "converted") probe.convertedAt = now;
  if (to === "cancelled") probe.cancelledAt = now;
  if (to === "stopped") probe.stoppedAt = now;

  return {
    plan: {
      ...plan,
      probe,
      updatedAt: now,
    },
  };
}

export function activateProbe(plan: TradePlan): {
  plan?: TradePlan;
  errors?: string[];
} {
  if (plan.decision?.verdict !== "probe") {
    return { errors: ["Probe activation requires decision verdict probe."] };
  }
  return applyProbeTransition(plan, "active");
}

export function convertProbe(plan: TradePlan): {
  plan?: TradePlan;
  errors?: string[];
} {
  return applyProbeTransition(plan, "converted");
}

export function cancelProbe(plan: TradePlan): {
  plan?: TradePlan;
  errors?: string[];
} {
  return applyProbeTransition(plan, "cancelled");
}

export function stopProbe(plan: TradePlan): {
  plan?: TradePlan;
  errors?: string[];
} {
  return applyProbeTransition(plan, "stopped");
}

export function formatProbeRiskMessage(probe: Probe): string {
  const risk = probe.riskPercent ?? DEFAULT_PROBE_RISK_PERCENT;
  const alloc = probe.allocationPercent;
  const parts = [`max ${risk}R`];
  if (alloc !== undefined) parts.push(`${alloc}% allocation`);
  return parts.join(" · ");
}

export function formatProbeSection(plan: TradePlan): string {
  if (!plan.probe?.enabled) return "";
  const p = plan.probe;
  const lines = [
    "=== PROBE ===",
    `status:${p.status}`,
    `risk:${formatProbeRiskMessage(p)}`,
  ];
  if (p.trigger) lines.push(`trigger:${p.trigger}`);
  if (p.expires) lines.push(`expires:${p.expires}`);
  if (p.reason) lines.push(`reason:${p.reason.replace(/\s+/g, " ").slice(0, 160)}`);
  if (p.shares !== undefined) lines.push(`shares:${p.shares}`);
  if (p.stop !== undefined) lines.push(`stop:${p.stop}`);
  return lines.join("\n");
}

export function parseProbeInput(raw: unknown): ProbeInput | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const p = raw as Record<string, unknown>;
  const input: ProbeInput = {};
  if (p.allocationPercent !== undefined) input.allocationPercent = Number(p.allocationPercent);
  if (p.riskPercent !== undefined) input.riskPercent = Number(p.riskPercent);
  if (p.shares !== undefined) input.shares = Number(p.shares);
  if (p.stop !== undefined) input.stop = Number(p.stop);
  if (p.reason !== undefined) input.reason = String(p.reason);
  if (p.expires !== undefined) input.expires = String(p.expires);
  if (p.trigger !== undefined) input.trigger = String(p.trigger);
  return input;
}
