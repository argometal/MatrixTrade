import type { Entity } from "@/lib/argus/types";
import {
  CONTACT_VALUE_OPTIONS,
  MY_VALUE_OPTIONS,
  countOfFive,
  contactValueLabel,
  myValueLabel,
  relationshipReasonLabel,
  relationshipStatusLabel,
} from "@/lib/argus/network-relationship-metrics";

export function NetworkRelationshipMetricsDisplay({ entity }: { entity: Entity }) {
  const contactValue = entity.contactValue ?? [];
  const myValue = entity.myValue ?? [];
  const relationshipStatus = entity.relationshipStatus ?? "healthy";
  const relationshipReason = entity.relationshipReason ?? "no_action_required";

  return (
    <div className="space-y-4 border-t border-zinc-800 pt-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Strategic Value</h3>
        <p className="mt-1 text-sm font-medium text-zinc-200">{countOfFive(contactValue)}</p>
        {contactValue.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {contactValue.map((key) => {
              const option = CONTACT_VALUE_OPTIONS.find((entry) => entry.key === key);
              return (
                <li key={key} className="text-sm text-zinc-300">
                  <span className="text-zinc-100">{contactValueLabel(key)}</span>
                  {option ? <span className="text-zinc-600"> — {option.description}</span> : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-zinc-600">No outcomes selected yet.</p>
        )}
      </div>

      <div className="border-t border-zinc-800/80 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">My Value</h3>
        <p className="mt-1 text-sm font-medium text-zinc-200">{countOfFive(myValue)}</p>
        {myValue.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {myValue.map((key) => {
              const option = MY_VALUE_OPTIONS.find((entry) => entry.key === key);
              return (
                <li key={key} className="text-sm text-zinc-300">
                  <span className="text-zinc-100">{myValueLabel(key)}</span>
                  {option ? <span className="text-zinc-600"> — {option.description}</span> : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-zinc-600">No outcomes selected yet.</p>
        )}
      </div>

      <div className="border-t border-zinc-800/80 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Attention</h3>
        <p className="mt-1 text-sm font-medium text-zinc-200">{relationshipStatusLabel(relationshipStatus)}</p>
        <p className="mt-1 text-sm text-zinc-500">{relationshipReasonLabel(relationshipReason)}</p>
      </div>
    </div>
  );
}
