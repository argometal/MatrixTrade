/**
 * DISABLED BY DESIGN — see lib/ai-session-disabled.ts
 * Blocked by ChatGPT platform capability, not by MatrixTrade.
 * UI removed from /ai-workspace; API routes return 503.
 */
"use client";

import { useState, useTransition } from "react";
import { CopyUrlButton } from "@/app/components/CopyUrlButton";
import { ShowQrPanel } from "@/app/components/system/ShowQrPanel";
import type { CreateAiSessionActionResult } from "@/app/actions";
import type { AiSessionPublic } from "@/lib/ai-session-types";

export function AiSessionPanel({
  sessions,
  createAction,
  revokeAction,
}: {
  sessions: AiSessionPublic[];
  createAction: (formData: FormData) => Promise<CreateAiSessionActionResult>;
  revokeAction: (formData: FormData) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    token: string;
    connectUrl: string;
    qrDataUrl: string;
  } | null>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createAction(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setCreated({
        token: result.token,
        connectUrl: result.connectUrl,
        qrDataUrl: result.qrDataUrl,
      });
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-zinc-600">
        Temporary session for AI trading assistance — read trades/stats and submit proposals to
        Inbox only. No Supabase or bridge tokens are exposed.
      </p>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {created && (
        <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-900">
            Session created — copy token or scan QR before leaving this page.
          </p>
          <div>
            <p className="text-xs font-semibold uppercase text-emerald-700">Bearer token</p>
            <p className="mt-1 break-all font-mono text-xs text-emerald-900">{created.token}</p>
            <CopyUrlButton url={created.token} label="Copy Bearer Token" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-emerald-700">Connect URL</p>
            <CopyUrlButton url={created.connectUrl} label="Copy Connect URL" />
            <ShowQrPanel
              qrDataUrl={created.qrDataUrl}
              caption="AI trading session (temporary)"
              url={created.connectUrl}
            />
          </div>
        </div>
      )}

      <form action={handleCreate} className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-xs font-medium text-zinc-500">TTL (minutes)</span>
          <input
            type="number"
            name="ttlMinutes"
            defaultValue={60}
            min={5}
            max={1440}
            className="mt-1 w-24 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="block text-xs font-medium text-zinc-500">Label (optional)</span>
          <input
            type="text"
            name="label"
            placeholder="AI collaborator"
            className="mt-1 w-40 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? "Creating…" : "New AI Trading Session"}
        </button>
      </form>

      {sessions.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Active sessions
          </p>
          <ul className="mt-2 divide-y divide-zinc-100 rounded-lg border border-zinc-200 text-sm">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                <div>
                  <span className="font-medium">{s.label ?? s.id.slice(0, 8)}</span>
                  <span className="ml-2 text-xs text-zinc-500">
                    expires {new Date(s.expiresAt).toLocaleString()}
                  </span>
                  {s.lastUsedAt && (
                    <span className="ml-2 text-xs text-zinc-400">
                      · last used {new Date(s.lastUsedAt).toLocaleString()}
                    </span>
                  )}
                </div>
                <form action={revokeAction}>
                  <input type="hidden" name="sessionId" value={s.id} />
                  <button type="submit" className="text-xs text-red-600 hover:underline">
                    Revoke
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
