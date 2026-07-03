import { promises as fs } from "fs";
import path from "path";
import { getBridgeConfig, getSnapshotReadUrl } from "./bridge";
import { resolveTradesDir } from "./obsidian";
import type { ExperimentRules, Trade } from "./types";

export interface TokenFlags {
  bridgeWrite: boolean;
  bridgeRead: boolean;
  inboxToken: boolean;
  tradingPassword: boolean;
}

export function getTokenFlags(): TokenFlags {
  return {
    bridgeWrite: Boolean(process.env.BRIDGE_WRITE_TOKEN?.trim()),
    bridgeRead: Boolean(process.env.BRIDGE_READ_TOKEN?.trim()),
    inboxToken: Boolean(process.env.MATRIXTRADE_INBOX_TOKEN?.trim()),
    tradingPassword: Boolean(process.env.MATRIXTRADE_PASSWORD?.trim()),
  };
}

export function getEnvironmentLabel(): string {
  if (process.env.VERCEL === "1") {
    return `production (Vercel · ${process.env.VERCEL_ENV ?? "unknown"})`;
  }
  return process.env.NODE_ENV === "production" ? "production (local)" : "development (local)";
}

export async function checkWorkerReachable(): Promise<{
  reachable: boolean;
  httpStatus?: number;
  snapshotRevision?: number;
  updatedAt?: string;
  error?: string;
}> {
  const { url, readToken, configured } = getBridgeConfig();
  if (!configured || !readToken) {
    return { reachable: false, error: "Bridge tokens not configured" };
  }

  try {
    const response = await fetch(`${url}/snapshot?token=${encodeURIComponent(readToken)}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        reachable: false,
        httpStatus: response.status,
        error: response.status === 404 ? "No snapshot on Worker yet — run Sync" : `HTTP ${response.status}`,
      };
    }

    const data = (await response.json()) as {
      snapshotRevision?: number;
      updatedAt?: string;
    };

    return {
      reachable: true,
      httpStatus: response.status,
      snapshotRevision: data.snapshotRevision,
      updatedAt: data.updatedAt,
    };
  } catch (err) {
    return { reachable: false, error: String(err) };
  }
}

export async function getLastNoteWritten(rules: ExperimentRules): Promise<{
  path: string | null;
  mtime: string | null;
}> {
  const dir = resolveTradesDir(rules);
  try {
    const files = await fs.readdir(dir);
    let latestPath: string | null = null;
    let latestMtime = 0;

    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const full = path.join(dir, file);
      const stat = await fs.stat(full);
      if (stat.mtimeMs > latestMtime) {
        latestMtime = stat.mtimeMs;
        latestPath = full;
      }
    }

    return {
      path: latestPath,
      mtime: latestPath ? new Date(latestMtime).toISOString() : null,
    };
  } catch {
    return { path: null, mtime: null };
  }
}

export function getLastReviewExported(trades: Trade[]): {
  tradeId: string | null;
  reviewedAt: string | null;
} {
  const reviewed = trades
    .filter((t) => t.reviewedAt)
    .sort((a, b) => (b.reviewedAt ?? "").localeCompare(a.reviewedAt ?? ""));

  const latest = reviewed[0];
  return {
    tradeId: latest?.id ?? null,
    reviewedAt: latest?.reviewedAt ?? null,
  };
}

export function getSnapshotUrlConfigured(): boolean {
  return Boolean(getSnapshotReadUrl());
}
