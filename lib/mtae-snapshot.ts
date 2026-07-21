import { buildMtaeProtocolBrief, buildMtaeTickerRequest } from "./mtae-brief";
import type { MtaeTimeframeMapPreset } from "./mtae-types";
import type { SnapshotMenuItem } from "./snapshot-types";
import { wrapSnapshotText } from "./snapshot-verification";

export function mtaeControlSnapshotItems(presets: MtaeTimeframeMapPreset[]): SnapshotMenuItem[] {
  const protocol = buildMtaeProtocolBrief(presets);
  const items: SnapshotMenuItem[] = [
    {
      id: "mtae-protocol",
      label: "MTAE protocol",
      description: "Technical analysis procedure — charts → technical-assessment JSON",
      text: wrapSnapshotText("MTAE protocol", protocol),
    },
  ];

  for (const preset of presets) {
    const body = [
      `=== MTAE TIMEFRAME MAP · ${preset.id} ===`,
      preset.label,
      preset.description ?? "",
      "",
      `strategic_tf: ${preset.roles.strategic_tf}`,
      `opportunity_tf: ${preset.roles.opportunity_tf}`,
      `refinement_tf: ${preset.roles.refinement_tf}`,
      `execution_tf: ${preset.roles.execution_tf}`,
      preset.roles.execution_detail_tf
        ? `execution_detail_tf: ${preset.roles.execution_detail_tf}`
        : null,
      "",
      "Use these roles in technical-assessment.proposal.timeframeRoles",
      `and set timeframeMapId: \"${preset.id}\" when matching this preset.`,
    ]
      .filter(Boolean)
      .join("\n");

    items.push({
      id: `mtae-map-${preset.id}`,
      label: `TF map · ${preset.id}`,
      description: preset.label,
      text: wrapSnapshotText(`MTAE TF map · ${preset.id}`, body),
    });
  }

  return items;
}

export function mtaeTickerRequestItem(input: {
  stockProfileId: string;
  ticker: string;
  presets: MtaeTimeframeMapPreset[];
  timeframeMapId?: string;
}): SnapshotMenuItem {
  const text = buildMtaeTickerRequest(input);
  return {
    id: "mtae-ticker-request",
    label: `${input.ticker} · MTAE request`,
    description: "Protocol request for this Stock File — attach charts, return technical-assessment",
    text: wrapSnapshotText(`${input.ticker} · MTAE request`, text),
  };
}
