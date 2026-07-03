/**
 * MatrixTrade bridge closure validation.
 * Run: npx tsx tools/validate-bridge-closure.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { applyTradingProposal } from "../lib/apply-trading-inbox";
import { buildBridgeSnapshot, publishSnapshotToBridge, getBridgeConfig } from "../lib/bridge";
import { nextSnapshotRevision } from "../lib/snapshot-revision";
import { getExperiment, getRules, getTrades } from "../lib/storage";
import { getSetups } from "../lib/setups";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const WORKER = "https://matrixtrade-bridge.argometal.workers.dev";
const LOCAL = process.env.MATRIXTRADE_URL ?? "http://localhost:3000";

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(ROOT, ".env.local"), "utf-8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    // optional
  }
}

type Evidence = Record<string, unknown>;

const evidence: Evidence[] = [];

function record(step: string, ok: boolean, detail: Record<string, unknown>) {
  evidence.push({ step, ok, ...detail });
  console.log(JSON.stringify({ step, ok, ...detail }));
}

function loadVars(): Record<string, string> {
  const raw = readFileSync(join(ROOT, "bridge", ".dev.vars"), "utf-8");
  const vars: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) vars[m[1]] = m[2].trim();
  }
  return vars;
}

async function fetchWorkerSnapshot(readToken: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${WORKER}/snapshot?token=${encodeURIComponent(readToken)}`);
  return (await res.json()) as Record<string, unknown>;
}

async function main() {
  loadEnvLocal();
  const vars = loadVars();
  const writeToken = process.env.BRIDGE_WRITE_TOKEN || vars.WRITE_TOKEN;
  const readToken = process.env.BRIDGE_READ_TOKEN || vars.READ_TOKEN;
  const bridge = getBridgeConfig();

  // --- 1. App local pages ---
  for (const path of ["/", "/inbox", "/trades"]) {
    try {
      const res = await fetch(`${LOCAL}${path}`, { redirect: "manual" });
      const location = res.headers.get("location");
      record(`GET ${path}`, res.status === 200 || res.status === 307, {
        httpStatus: res.status,
        location: location ?? null,
        note: res.status === 307 ? "auth redirect to login (expected if password set)" : "page reachable",
      });
    } catch (e) {
      record(`GET ${path}`, false, { error: String(e) });
    }
  }

  const tradesLocal = JSON.parse(readFileSync(join(ROOT, "data", "trades.json"), "utf-8"));
  const h001Local = tradesLocal.find((t: { id: string }) => t.id === "H001");
  record("H001 visible in data/trades.json", Boolean(h001Local), {
    id: h001Local?.id,
    ticker: h001Local?.ticker,
    reviewedAt: h001Local?.reviewedAt,
  });

  // --- 2. Sync (revision before) ---
  const snapBefore = await fetchWorkerSnapshot(readToken);
  const revisionBefore = snapBefore.snapshotRevision ?? null;

  const [experiment, trades, rules, setups] = await Promise.all([
    getExperiment(),
    getTrades(),
    getRules(),
    getSetups(),
  ]);
  const revision = await nextSnapshotRevision();
  const body = buildBridgeSnapshot(experiment, trades, rules, setups, revision);
  const syncResult = await publishSnapshotToBridge(body);

  record("Sync POST /snapshot", "ok" in syncResult, {
    httpStatus: "ok" in syncResult ? syncResult.httpStatus : syncResult.httpStatus,
    error: "error" in syncResult ? syncResult.error : null,
    snapshotRevisionBefore: revisionBefore,
    snapshotRevisionAfter: revision,
    updatedAt: "ok" in syncResult ? syncResult.updatedAt : null,
    bridgeConfigured: bridge.configured,
  });

  const snapAfterSync = await fetchWorkerSnapshot(readToken);
  const h001Worker = (snapAfterSync.trades as Array<Record<string, unknown>> | undefined)?.find(
    (t) => t.id === "H001"
  );
  record("H001 in Worker snapshot after sync", Boolean(h001Worker), {
    snapshotRevision: snapAfterSync.snapshotRevision,
    schemaVersion: snapAfterSync.schemaVersion,
    h001ReviewedAt: h001Worker?.reviewedAt,
    h001Mistakes: h001Worker?.mistakes,
  });

  // --- 3. Inbox: POST analysis append (visible change in Obsidian) ---
  const inboxPayload = {
    type: "analysis",
    source: "chatgpt-closure-test",
    proposal: {
      id: "H001",
      lessons: `Closure validation ${new Date().toISOString()}`,
      notes: "Bridge phase closure test — appended via Worker inbox.",
    },
  };

  const postInbox = await fetch(`${WORKER}/inbox`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${writeToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(inboxPayload),
  });
  const postInboxJson = (await postInbox.json()) as { id?: string; status?: string };
  const inboxItemId = postInboxJson.id ?? null;

  record("POST /inbox", postInbox.ok, {
    httpStatus: postInbox.status,
    inboxItemId,
    status: postInboxJson.status,
  });

  const getInbox = await fetch(`${WORKER}/inbox?token=${encodeURIComponent(readToken)}`);
  const inbox = (await getInbox.json()) as { items?: Array<{ id: string; status: string }> };
  const pending = inbox.items?.find((i) => i.id === inboxItemId && i.status === "pending");
  record("GET /inbox pending item", Boolean(pending), {
    httpStatus: getInbox.status,
    found: Boolean(pending),
    inboxItemId,
  });

  const obsidianBefore = readFileSync(join(ROOT, "vault", "Trades", "H001-AMZN.md"), "utf-8");
  const tradesBefore = readFileSync(join(ROOT, "data", "trades.json"), "utf-8");

  const applyResult = await applyTradingProposal(inboxPayload);
  record("Apply (lib/apply-trading-inbox)", applyResult.ok, {
    message: applyResult.ok ? applyResult.message : null,
    errors: !applyResult.ok ? applyResult.errors : null,
  });

  const obsidianAfter = readFileSync(join(ROOT, "vault", "Trades", "H001-AMZN.md"), "utf-8");
  const tradesAfter = readFileSync(join(ROOT, "data", "trades.json"), "utf-8");
  record("Obsidian H001-AMZN.md updated", obsidianAfter !== obsidianBefore, {
    path: "vault/Trades/H001-AMZN.md",
    addedBytes: obsidianAfter.length - obsidianBefore.length,
    containsClosureMarker: obsidianAfter.includes("Bridge phase closure test"),
  });
  record("data/trades.json unchanged for analysis apply", tradesBefore === tradesAfter, {
    note: "analysis type appends Obsidian only — expected",
  });

  const ack = await fetch(`${WORKER}/inbox/${encodeURIComponent(inboxItemId!)}/ack`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${writeToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "applied" }),
  });
  record("POST /inbox/{id}/ack", ack.ok, {
    httpStatus: ack.status,
    inboxItemId,
    body: (await ack.text()).slice(0, 120),
  });

  // --- 4. Re-sync after apply ---
  const revision2 = await nextSnapshotRevision();
  const [exp2, tr2, rules2, setups2] = await Promise.all([
    getExperiment(),
    getTrades(),
    getRules(),
    getSetups(),
  ]);
  const body2 = buildBridgeSnapshot(exp2, tr2, rules2, setups2, revision2);
  const resync = await publishSnapshotToBridge(body2);
  const snapFinal = await fetchWorkerSnapshot(readToken);
  const h001Final = (snapFinal.trades as Array<Record<string, unknown>> | undefined)?.find(
    (t) => t.id === "H001"
  );

  record("Re-sync after apply", "ok" in resync, {
    httpStatus: "ok" in resync ? resync.httpStatus : null,
    snapshotRevision: snapFinal.snapshotRevision,
    h001ReviewedAt: h001Final?.reviewedAt,
    h001Lesson: h001Final?.lesson,
  });

  const allOk = evidence.every((e) => e.ok === true);
  record("BRIDGE_PHASE_CLOSURE", allOk, {
    workerUrl: WORKER,
    localUrl: LOCAL,
    routes: ["/", "/inbox", "/trades", "/connect"],
    totalSteps: evidence.length,
    failed: evidence.filter((e) => !e.ok).map((e) => e.step),
  });

  writeFileSync(
    join(ROOT, "tools", "bridge-closure-evidence.json"),
    JSON.stringify({ at: new Date().toISOString(), evidence }, null, 2) + "\n",
    "utf-8"
  );
}

main().catch((err) => {
  record("fatal", false, { error: String(err) });
  process.exit(1);
});
