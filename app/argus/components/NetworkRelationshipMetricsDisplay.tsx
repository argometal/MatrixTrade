import type { Entity } from "@/lib/argus/types";
import type { DerivedRelationshipAttention } from "@/lib/argus/network-relationship-metrics";
import {
  CONTACT_VALUE_OPTIONS,
  MY_VALUE_OPTIONS,
  countOfFive,
  contactValueLabel,
  myValueLabel,
  relationshipReasonLabel,
  relationshipStatusLabel,
} from "@/lib/argus/network-relationship-metrics";

export function NetworkRelationshipMetricsDisplay({
  entity,
  attention,
}: {
  entity: Entity;
  attention: DerivedRelationshipAttention;
}) {
  const contactValue = entity.contactValue ?? [];
  const myValue = entity.myValue ?? [];

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
        <p className="mt-1 text-sm font-medium text-zinc-200">{relationshipStatusLabel(attention.status)}</p>
        <p className="mt-1 text-sm text-zinc-500">{relationshipReasonLabel(attention.reason)}</p>
        <p className="mt-2 text-[11px] leading-snug text-zinc-600">
          Derived from follow-ups, inbox links, interaction recency, and opportunity signals — not manually set.
        </p>
      </div>
    </div>
  );
}
