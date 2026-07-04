import { getBridgeConfig } from "./bridge";
import { createLocalInboxItem } from "./trading-inbox-storage";

export async function submitInboxProposal(
  payload: Record<string, unknown>
): Promise<
  | { ok: true; inboxItemId: string; receivedAt: string; origin: "worker" | "local" }
  | { ok: false; error: string }
> {
  const body = {
    ...payload,
    source: typeof payload.source === "string" ? payload.source : "ai-api",
  };

  const workerResult = await postBridgeInboxProposal(body);
  if (workerResult.ok) {
    return {
      ok: true,
      inboxItemId: workerResult.id,
      receivedAt: workerResult.receivedAt,
      origin: "worker",
    };
  }

  if (workerResult.skipped) {
    const local = await createLocalInboxItem(body);
    return {
      ok: true,
      inboxItemId: local.id,
      receivedAt: local.receivedAt,
      origin: "local",
    };
  }

  return { ok: false, error: workerResult.error };
}

async function postBridgeInboxProposal(
  payload: Record<string, unknown>
): Promise<
  | { ok: true; id: string; receivedAt: string }
  | { ok: false; error: string; skipped?: boolean }
> {
  const { url, writeToken, configured } = getBridgeConfig();
  if (!configured || !writeToken) {
    return { ok: false, error: "Bridge not configured", skipped: true };
  }

  try {
    const response = await fetch(`${url}/inbox`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${writeToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, error: `Worker inbox POST failed (${response.status}): ${text}` };
    }

    const data = (await response.json()) as {
      id?: string;
      receivedAt?: string;
    };

    if (!data.id) {
      return { ok: false, error: "Worker inbox response missing id" };
    }

    return {
      ok: true,
      id: data.id,
      receivedAt: data.receivedAt ?? new Date().toISOString(),
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Worker inbox request failed" };
  }
}
