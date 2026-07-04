import Link from "next/link";
import { formatDate } from "./ui";
import {
  RELATIONSHIP_HEALTH_COLORS,
  RELATIONSHIP_HEALTH_LABELS,
  STRATEGIC_VALUE_LABELS,
} from "@/lib/argus/labels";
import type { EntityIntelligence } from "@/lib/argus/network-intelligence";
import { entityDetailHref } from "@/lib/argus/reference-types";

export function NetworkEntityCard({ intel }: { intel: EntityIntelligence }) {
  const { entity, relationshipHealth, lastMeaningfulInteraction, attentionScore, outcomeScore, openFollowUps } =
    intel;
  const sv = entity.strategicValue ?? 3;

  return (
    <Link href={entityDetailHref(entity)}>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-zinc-700">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-zinc-50">{entity.name}</p>
            {entity.alias && <p className="text-xs text-zinc-500">{entity.alias}</p>}
          </div>
          <span className={`shrink-0 text-[11px] font-medium ${RELATIONSHIP_HEALTH_COLORS[relationshipHealth]}`}>
            {RELATIONSHIP_HEALTH_LABELS[relationshipHealth]}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
          <span>Strategic {sv}/5</span>
          {lastMeaningfulInteraction && <span>Last: {formatDate(lastMeaningfulInteraction)}</span>}
          {openFollowUps > 0 && <span className="text-amber-400">{openFollowUps} follow-up{openFollowUps !== 1 ? "s" : ""}</span>}
          <span>Outcome {outcomeScore}</span>
          <span className="text-teal-500/80">Attention {attentionScore}</span>
        </div>
        <p className="mt-1 line-clamp-1 text-[11px] text-zinc-600">{STRATEGIC_VALUE_LABELS[sv]}</p>
      </div>
    </Link>
  );
}

function NetworkSection({
  title,
  items,
  empty,
}: {
  title: string;
  items: EntityIntelligence[];
  empty: string;
}) {
  if (items.length === 0) {
    return (
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">{title}</h2>
        <p className="text-sm text-zinc-600">{empty}</p>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">{title}</h2>
      <div className="space-y-3">
        {items.map((intel) => (
          <NetworkEntityCard key={intel.entity.id} intel={intel} />
        ))}
      </div>
    </section>
  );
}

export function NetworkHomeSections({
  sections,
}: {
  sections: {
    needsAttention: EntityIntelligence[];
    topStrategic: EntityIntelligence[];
    recentlyActive: EntityIntelligence[];
    dormant: EntityIntelligence[];
    recentlyUpdated: EntityIntelligence[];
  };
}) {
  return (
    <>
      <NetworkSection
        title="Needs attention"
        items={sections.needsAttention}
        empty="No relationships need attention right now."
      />
      <NetworkSection
        title="Top strategic contacts"
        items={sections.topStrategic}
        empty="Mark entities as strategic value 4–5 to surface them here."
      />
      <NetworkSection
        title="Recently active"
        items={sections.recentlyActive}
        empty="Active relationships appear after meaningful journal activity."
      />
      <NetworkSection
        title="Dormant relationships"
        items={sections.dormant}
        empty="No dormant or neglected relationships detected."
      />
      <NetworkSection
        title="Recently updated"
        items={sections.recentlyUpdated}
        empty="No entities yet."
      />
    </>
  );
}
