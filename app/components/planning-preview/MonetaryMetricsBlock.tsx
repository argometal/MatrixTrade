import {
  formatMonetaryMetricsBlock,
  formatPotentialR,
  formatUsdMoney,
  resolvePotentialR,
} from "@/lib/scout-monetary-metrics";
import type { LayeredFillStateProjection } from "@/lib/layered-entry-risk";

export function MonetaryMetricsLines({
  potentialR,
  potentialProfit,
  assignedLoss,
  capitalRequired,
  returnOnCapitalPercent,
  className = "space-y-0.5 text-xs text-zinc-400",
}: {
  potentialR?: number;
  potentialProfit: number;
  assignedLoss: number;
  capitalRequired: number;
  returnOnCapitalPercent: number;
  className?: string;
}) {
  const lines = formatMonetaryMetricsBlock({
    potentialR,
    potentialProfit,
    assignedLoss,
    capitalRequired,
    returnOnCapitalPercent,
  });
  return (
    <ul className={className}>
      {lines.map((line) => (
        <li key={line} className="font-mono tabular-nums">
          {line}
        </li>
      ))}
    </ul>
  );
}

export function FillStateMonetaryMetrics({
  state,
  compact = false,
}: {
  state: LayeredFillStateProjection;
  compact?: boolean;
}) {
  const potentialR = resolvePotentialR(state);
  if (compact) {
    return (
      <p className="mt-1 space-x-2 font-mono text-[11px] text-zinc-500">
        <span>{formatPotentialR(potentialR)}</span>
        <span>·</span>
        <span>GP {formatUsdMoney(state.potentialProfit)}</span>
        <span>·</span>
        <span>PA {formatUsdMoney(state.assignedLoss)}</span>
      </p>
    );
  }
  return (
    <MonetaryMetricsLines
      potentialR={potentialR}
      potentialProfit={state.potentialProfit}
      assignedLoss={state.assignedLoss}
      capitalRequired={state.capitalDeployed}
      returnOnCapitalPercent={state.returnOnCapitalPercent}
      className="mt-2 space-y-0.5 text-[11px] text-zinc-400"
    />
  );
}
