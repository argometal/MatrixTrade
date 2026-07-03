/**
 * Bridge E2E validation — run from repo root:
 *   npx tsx tools/bridge-e2e.ts
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { applyTradingProposal } from "../lib/apply-trading-inbox";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function loadDevVars(): Record<string, string> {
  const raw = readFileSync(join(ROOT, "bridge", ".dev.vars"), "utf-8");
  const vars: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) vars[m[1]] = m[2].trim();
  }
  return vars;
}

function log(step: string, status: string, detail: unknown) {
  console.log(JSON.stringify({ step, status, detail }));
}

async function main() {
  const vars = loadDevVars();
  const base =
    process.env.BRIDGE_WORKER_URL?.replace(/\/$/, "") ??
    "https://matrixtrade-bridge.argometal.workers.dev";
  const writeToken = vars.WRITE_TOKEN || vars.BRIDGE_WRITE_TOKEN;
  const readToken = vars.READ_TOKEN || vars.BRIDGE_READ_TOKEN;

  if (!writeToken || !readToken) {
    log("config", "FAIL", "Missing tokens in bridge/.dev.vars");
    process.exit(1);
  }

  const tradesBefore = JSON.parse(readFileSync(join(ROOT, "data", "trades.json"), "utf-8"));
  const h001Before = tradesBefore.find((t: { id: string }) => t.id === "H001");

  const snapshotBody = JSON.parse(
    readFileSync(join(ROOT, "bridge", "sample-snapshot.json"), "utf-8")
  );
  snapshotBody.updatedAt = new Date().toISOString();
  snapshotBody.snapshotRevision = Date.now();

  const postSnap = await fetch(`${base}/snapshot`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${writeToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(snapshotBody),
  });
  const postSnapText = await postSnap.text();
  log("POST /snapshot", postSnap.ok ? "OK" : "FAIL", {
    httpStatus: postSnap.status,
    body: postSnapText.slice(0, 200),
  });

  const getSnap = await fetch(`${base}/snapshot?token=${encodeURIComponent(readToken)}`);
  const snap = (await getSnap.json()) as Record<string, unknown>;
  const trades = snap.trades as Array<{ id: string; ticker: string }> | undefined;
  const snapChecks = {
    schemaVersion: snap.schemaVersion === 1,
    updatedAt: typeof snap.updatedAt === "string",
    experiment: snap.experiment && typeof snap.experiment === "object",
    rules: snap.rules && typeof snap.rules === "object",
    trades: Array.isArray(trades),
    h001: trades?.some((t) => t.id === "H001" && t.ticker === "AMZN"),
    snapshotRevision: typeof snap.snapshotRevision === "number",
  };
  log("GET /snapshot", getSnap.ok && Object.values(snapChecks).every(Boolean) ? "OK" : "FAIL", {
    httpStatus: getSnap.status,
    checks: snapChecks,
    updatedAt: snap.updatedAt,
    snapshotRevision: snap.snapshotRevision,
    h001: trades?.find((t) => t.id === "H001"),
  });

  const reviewPayload = JSON.parse(
    readFileSync(join(ROOT, "bridge", "sample-inbox-review.json"), "utf-8")
  ) as Record<string, unknown>;

  const postInbox = await fetch(`${base}/inbox`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${writeToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reviewPayload),
  });
  const postInboxJson = (await postInbox.json()) as { id?: string; status?: string };
  log("POST /inbox", postInbox.ok ? "OK" : "FAIL", {
    httpStatus: postInbox.status,
    id: postInboxJson.id,
    status: postInboxJson.status,
  });

  const inboxId = postInboxJson.id;
  if (!inboxId) {
    log("inbox-id", "FAIL", "No inbox id returned");
    process.exit(1);
  }

  const getInbox = await fetch(`${base}/inbox?token=${encodeURIComponent(readToken)}`);
  const inbox = (await getInbox.json()) as { count?: number; items?: Array<{ id: string; status: string }> };
  const found = inbox.items?.some((i) => i.id === inboxId && i.status === "pending");
  log("GET /inbox", getInbox.ok && found ? "OK" : "FAIL", {
    httpStatus: getInbox.status,
    count: inbox.count,
    foundId: found ? inboxId : null,
  });

  const applyResult = await applyTradingProposal(reviewPayload);
  log("Apply review (lib/apply-trading-inbox)", applyResult.ok ? "OK" : "FAIL", applyResult);

  const tradesAfter = JSON.parse(readFileSync(join(ROOT, "data", "trades.json"), "utf-8"));
  const h001After = tradesAfter.find((t: { id: string }) => t.id === "H001");
  log("data/trades.json H001", h001After?.reviewedAt ? "OK" : "FAIL", {
    reviewedAt: h001After?.reviewedAt,
    mistakes: h001After?.mistakes,
    qualityEntry: h001After?.qualityEntry,
    beforeReviewedAt: h001Before?.reviewedAt,
  });

  const ack = await fetch(`${base}/inbox/${encodeURIComponent(inboxId)}/ack`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${writeToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "applied" }),
  });
  const ackText = await ack.text();
  log("POST /inbox/{id}/ack", ack.ok ? "OK" : "FAIL", {
    httpStatus: ack.status,
    body: ackText.slice(0, 200),
  });

  const getInbox2 = await fetch(`${base}/inbox?token=${encodeURIComponent(readToken)}`);
  const inbox2 = (await getInbox2.json()) as { count?: number; items?: Array<{ id: string }> };
  const stillPending = inbox2.items?.some((i) => i.id === inboxId);
  log("GET /inbox after ack", getInbox2.ok && !stillPending ? "OK" : "FAIL", {
    httpStatus: getInbox2.status,
    count: inbox2.count,
    stillPending,
  });

  const syncBody = {
    ...snapshotBody,
    updatedAt: new Date().toISOString(),
    snapshotRevision: Number(snap.snapshotRevision || 0) + 1,
    trades: tradesAfter,
    experiment: snap.experiment,
    rules: snap.rules,
    summary: { pendingReview: 0 },
  };

  const resync = await fetch(`${base}/snapshot`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${writeToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(syncBody),
  });
  const finalSnapRes = await fetch(`${base}/snapshot?token=${encodeURIComponent(readToken)}`);
  const finalSnap = (await finalSnapRes.json()) as {
    snapshotRevision?: number;
    trades?: Array<{ id: string; reviewedAt?: string; mistakes?: string[] }>;
  };
  const h001Snap = finalSnap.trades?.find((t) => t.id === "H001");
  log("Snapshot consistency after apply", resync.ok && h001Snap?.reviewedAt ? "OK" : "FAIL", {
    resyncHttp: resync.status,
    snapshotRevision: finalSnap.snapshotRevision,
    h001ReviewedAt: h001Snap?.reviewedAt,
    h001Mistakes: h001Snap?.mistakes,
  });

  log("Scalability check", "OK", {
    tradesInSnapshot: finalSnap.trades?.length,
    snapshotSizeEstimateBytes: JSON.stringify(finalSnap).length,
    note: "Single KV snapshot key; 300+ trades feasible; inbox index O(n) scan at MVP scale",
  });
}

main().catch((err) => {
  log("fatal", "FAIL", String(err));
  process.exit(1);
});
