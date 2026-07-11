"use client";

import type { Entity } from "@/lib/argus/types";
import {
  NETWORK_CAPTURE_LENSES,
  NETWORK_CONTACT_FLOW,
  NETWORK_DIALOGUE_PILLARS,
  NETWORK_OPENING_QUESTIONS,
} from "@/lib/argus/network-dialogue";
import { V2Card } from "@/app/argus/v2/components/v2-ui";

export function NetworkDialogueGuide({
  entityName,
  email,
  linkedIn,
  onRegister,
}: {
  entityName: string;
  email: string | null;
  linkedIn: string | null;
  onRegister: () => void;
}) {
  return (
    <section className="space-y-4">
      <V2Card className="border-violet-500/20 bg-violet-950/15 p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-400/90">Start the dialogue</p>
        <h2 className="mt-1 text-lg font-semibold text-zinc-50">Contact before evaluation</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Networking is not asking for help — it is building distributed intelligence. With {entityName}, the first
          step is a real conversation: trust, listen, help where you can, then record what you learned.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRegister}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
          >
            + Register conversation
          </button>
          {email ? (
            <a
              href={`mailto:${email}`}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Email
            </a>
          ) : null}
          {linkedIn ? (
            <a
              href={linkedIn}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              LinkedIn
            </a>
          ) : null}
        </div>
      </V2Card>

      <V2Card className="p-5">
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Flow</h3>
        <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {NETWORK_CONTACT_FLOW.map((item) => (
            <li
              key={item.step}
              className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-3 py-2.5"
            >
              <p className="text-[10px] font-semibold tabular-nums text-violet-400">Step {item.step}</p>
              <p className="text-sm font-medium text-zinc-200">{item.label}</p>
              <p className="mt-0.5 text-[11px] text-zinc-500">{item.detail}</p>
            </li>
          ))}
        </ol>
      </V2Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <V2Card className="p-5">
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Pillars</h3>
          <ul className="mt-3 space-y-2">
            {NETWORK_DIALOGUE_PILLARS.map((pillar) => (
              <li key={pillar.id} className="rounded-lg bg-zinc-900/50 px-3 py-2">
                <p className="text-sm font-medium text-zinc-200">{pillar.label}</p>
                <p className="text-[11px] text-zinc-500">{pillar.hint}</p>
              </li>
            ))}
          </ul>
        </V2Card>

        <V2Card className="p-5">
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Opening questions</h3>
          <p className="mt-1 text-[11px] text-zinc-600">Skip “How are you?” — go for signal.</p>
          <ul className="mt-3 space-y-1.5">
            {NETWORK_OPENING_QUESTIONS.map((question) => (
              <li key={question} className="text-sm text-zinc-300">
                · {question}
              </li>
            ))}
          </ul>
        </V2Card>
      </div>

      <V2Card className="p-5">
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">After you talk — capture</h3>
        <p className="mt-1 text-[11px] text-zinc-600">
          Register even partial answers. Relationship overview unlocks once there is evidence.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {NETWORK_CAPTURE_LENSES.map((lens) => (
            <span
              key={lens}
              className="rounded-full border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-[11px] text-zinc-400"
            >
              {lens}
            </span>
          ))}
        </div>
      </V2Card>
    </section>
  );
}
