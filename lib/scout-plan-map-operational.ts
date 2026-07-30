/**
 * Concise operational paragraph for Scout Plan Map.
 * Built only from persisted structured plan / layeredEntry data — never from notes or reasoning.
 */

export type PlanMapOperationalLayer = {
  price: number;
  allocationPercent?: number;
  shares?: number;
  stopPrice?: number;
};

export type PlanMapOperationalInput = {
  mode: "single_entry" | "layered";
  layers: PlanMapOperationalLayer[];
  stopModel?: string;
  commonStop?: number;
  primaryTarget?: number;
  referenceEntry?: number;
  /** risk → "% of authorized risk"; otherwise "% of planned position". */
  allocationMeaning?: "risk" | "capital" | "position";
};

function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  if (Number.isInteger(value)) return String(value);
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function joinList(parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!;
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

function allocationBasis(meaning?: PlanMapOperationalInput["allocationMeaning"]): string {
  return meaning === "risk" ? "authorized risk" : "planned position";
}

function formatStopAndTarget(input: PlanMapOperationalInput): string | undefined {
  const stopModel = input.stopModel ?? "common";
  const parts: string[] = [];

  if (stopModel === "common" && input.commonStop !== undefined) {
    parts.push(`a common stop at ${formatPrice(input.commonStop)}`);
  } else if (stopModel === "per_layer") {
    const stops = input.layers
      .map((layer) => layer.stopPrice)
      .filter((s): s is number => s !== undefined && Number.isFinite(s));
    if (stops.length === input.layers.length && stops.length > 0) {
      parts.push(`per-layer stops at ${joinList(stops.map(formatPrice))}`);
    } else if (input.commonStop !== undefined) {
      parts.push(`per-layer stops (fallback ${formatPrice(input.commonStop)})`);
    } else {
      parts.push("per-layer stops");
    }
  } else if (input.commonStop !== undefined) {
    parts.push(`stop at ${formatPrice(input.commonStop)}`);
  }

  if (input.primaryTarget !== undefined) {
    parts.push(`primary target at ${formatPrice(input.primaryTarget)}`);
  }

  if (parts.length === 0) return undefined;
  if (parts.length === 1) return `Use ${parts[0]}.`;
  return `Use ${parts[0]} and ${parts[1]}.`;
}

function allLayersHaveShares(layers: PlanMapOperationalLayer[]): boolean {
  return (
    layers.length > 0 &&
    layers.every(
      (layer) =>
        layer.shares !== undefined &&
        Number.isFinite(layer.shares) &&
        layer.shares > 0
    )
  );
}

function allLayersHaveAllocation(layers: PlanMapOperationalLayer[]): boolean {
  return (
    layers.length > 0 &&
    layers.every(
      (layer) =>
        layer.allocationPercent !== undefined &&
        Number.isFinite(layer.allocationPercent)
    )
  );
}

function formatLayeredSharesSentence(layers: PlanMapOperationalLayer[]): string {
  const parts = layers.map(
    (layer) =>
      `${layer.shares} share${layer.shares === 1 ? "" : "s"} at ${formatPrice(layer.price)}`
  );
  return `Enter ${joinList(parts)}.`;
}

function formatLayeredAllocationSentence(
  layers: PlanMapOperationalLayer[],
  meaning?: PlanMapOperationalInput["allocationMeaning"]
): string {
  const basis = allocationBasis(meaning);
  const parts = layers.map((layer, index) => {
    const pct = layer.allocationPercent!;
    const price = formatPrice(layer.price);
    if (index === 0) return `${pct}% of ${basis} at ${price}`;
    return `${pct}% at ${price}`;
  });
  return `Enter with ${joinList(parts)}.`;
}

function formatSingleEntrySentence(input: PlanMapOperationalInput): string | undefined {
  const entry = input.referenceEntry ?? input.layers[0]?.price;
  if (entry === undefined) return undefined;

  const pieces: string[] = [`Enter at ${formatPrice(entry)}`];
  const stop = input.commonStop ?? input.layers[0]?.stopPrice;
  if (stop !== undefined) pieces.push(`with stop at ${formatPrice(stop)}`);
  if (input.primaryTarget !== undefined) {
    pieces.push(
      pieces.length > 1
        ? `and primary target at ${formatPrice(input.primaryTarget)}`
        : `with primary target at ${formatPrice(input.primaryTarget)}`
    );
  }
  return `${pieces.join(" ")}.`;
}

/**
 * One operational paragraph for the Plan Map.
 * Prefer exact shares when every layer has a calculated quantity; otherwise allocation %.
 */
export function formatPlanMapOperationalParagraph(
  input: PlanMapOperationalInput
): string | undefined {
  if (input.mode === "single_entry" || input.layers.length < 2) {
    return formatSingleEntrySentence(input);
  }

  // Layered (2+ levels) — shares preferred when fully calculable.
  if (allLayersHaveShares(input.layers)) {
    const sentences = [
      formatLayeredSharesSentence(input.layers),
      formatStopAndTarget(input),
    ];
    return sentences.filter(Boolean).join(" ");
  }

  if (allLayersHaveAllocation(input.layers)) {
    const sentences = [
      formatLayeredAllocationSentence(input.layers, input.allocationMeaning),
      formatStopAndTarget(input),
      "Any layer not reached remains unfilled.",
    ];
    return sentences.filter(Boolean).join(" ");
  }

  // Incomplete structured layers — still state stop/target if present.
  return formatStopAndTarget(input);
}
