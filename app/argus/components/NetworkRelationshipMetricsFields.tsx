"use client";

import type { Entity } from "@/lib/argus/types";
import {
  CONTACT_VALUE_OPTIONS,
  MY_VALUE_OPTIONS,
  countOfFive,
} from "@/lib/argus/network-relationship-metrics";

function CheckboxGroup({
  title,
  subtitle,
  counter,
  options,
  fieldName,
  selected,
}: {
  title: string;
  subtitle: string;
  counter: string;
  fieldName: "contactValue" | "myValue";
  options: Array<{ key: string; label: string; description: string }>;
  selected: string[];
}) {
  return (
    <fieldset className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <legend className="px-1 text-sm font-semibold text-zinc-100">
        {title} <span className="font-normal text-zinc-500">({counter})</span>
      </legend>
      <p className="mt-1 text-[11px] leading-snug text-zinc-600">{subtitle}</p>
      <div className="mt-3 space-y-2">
        {options.map((option) => (
          <label
            key={option.key}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5 hover:border-zinc-700"
          >
            <input
              type="checkbox"
              name={fieldName}
              value={option.key}
              defaultChecked={selected.includes(option.key)}
              className="mt-0.5 rounded border-zinc-700 bg-zinc-900"
            />
            <span className="min-w-0">
              <span className="block text-sm text-zinc-200">{option.label}</span>
              <span className="block text-[11px] leading-snug text-zinc-600">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function NetworkRelationshipMetricsFields({ entity }: { entity: Entity }) {
  const contactValue = entity.contactValue ?? [];
  const myValue = entity.myValue ?? [];

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Relationship metrics</p>

      <CheckboxGroup
        title="Contact Value"
        subtitle="What this person brings to me — select all that consistently describe the relationship."
        counter={countOfFive(contactValue)}
        fieldName="contactValue"
        options={CONTACT_VALUE_OPTIONS}
        selected={contactValue}
      />

      <CheckboxGroup
        title="My Value"
        subtitle="What I bring to this person — select all that describe your consistent contribution."
        counter={countOfFive(myValue)}
        fieldName="myValue"
        options={MY_VALUE_OPTIONS}
        selected={myValue}
      />

      <p className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-4 py-3 text-[11px] leading-snug text-zinc-600">
        Relationship status and reason update automatically from follow-ups, linked inbox items, and interaction
        history when you save contact/my value changes.
      </p>
    </div>
  );
}
