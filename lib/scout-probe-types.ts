export type ProbeStatus = "authorized" | "active" | "converted" | "cancelled" | "stopped";

export interface Probe {
  enabled: boolean;
  allocationPercent?: number;
  riskPercent?: number;
  shares?: number;
  stop?: number;
  reason?: string;
  expires?: string;
  trigger?: string;
  status: ProbeStatus;
  convertedAt?: string;
  cancelledAt?: string;
  stoppedAt?: string;
}

/** Input shape for authorizing a probe via decision-update or human form. */
export interface ProbeInput {
  allocationPercent?: number;
  riskPercent?: number;
  shares?: number;
  stop?: number;
  reason?: string;
  expires?: string;
  trigger?: string;
}

export const PROBE_STATUS_LABELS: Record<ProbeStatus, string> = {
  authorized: "Authorized",
  active: "Active",
  converted: "Converted",
  cancelled: "Cancelled",
  stopped: "Stopped",
};

/** Default bounded probe risk messaging (0.10R). */
export const DEFAULT_PROBE_RISK_PERCENT = 0.1;
