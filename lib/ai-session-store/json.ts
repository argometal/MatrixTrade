/**
 * DISABLED BY DESIGN — see lib/ai-session-disabled.ts
 * Blocked by ChatGPT platform capability, not by MatrixTrade.
 */
import { promises as fs } from "fs";
import path from "path";
import type { AiSessionPublic, AiSessionRecord, CreateAiSessionOptions } from "../ai-session-types";
import { AI_DEFAULT_SCOPES } from "../ai-session-types";
import { generateAiSessionToken, hashAiSessionToken } from "../ai-session-crypto";

const SESSIONS_FILE = path.join(process.cwd(), "data", "ai-sessions.json");

interface SessionFile {
  sessions: AiSessionRecord[];
}

async function readFile(): Promise<SessionFile> {
  try {
    const raw = await fs.readFile(SESSIONS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as SessionFile;
    if (parsed?.sessions && Array.isArray(parsed.sessions)) return parsed;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw err;
  }
  return { sessions: [] };
}

async function writeFile(data: SessionFile): Promise<void> {
  await fs.mkdir(path.dirname(SESSIONS_FILE), { recursive: true });
  const tmp = `${SESSIONS_FILE}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
  await fs.rename(tmp, SESSIONS_FILE);
}

function toPublic(record: AiSessionRecord): AiSessionPublic {
  return {
    id: record.id,
    scopes: record.scopes,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    lastUsedAt: record.lastUsedAt,
    revokedAt: record.revokedAt,
    oneTime: record.oneTime,
    label: record.label,
  };
}

function isActive(record: AiSessionRecord, now = Date.now()): boolean {
  if (record.revokedAt) return false;
  if (Date.parse(record.expiresAt) <= now) return false;
  if (record.oneTime && record.usedAt) return false;
  return true;
}

export async function createJsonAiSession(
  options: CreateAiSessionOptions = {}
): Promise<{ token: string; session: AiSessionPublic }> {
  const token = generateAiSessionToken();
  const tokenHash = hashAiSessionToken(token);
  const ttlMinutes = options.ttlMinutes ?? 60;
  const now = new Date();
  const record: AiSessionRecord = {
    id: crypto.randomUUID(),
    tokenHash,
    scopes: options.scopes?.length ? [...options.scopes] : [...AI_DEFAULT_SCOPES],
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMinutes * 60_000).toISOString(),
    oneTime: options.oneTime ?? false,
    label: options.label,
  };

  const file = await readFile();
  file.sessions.push(record);
  await writeFile(file);

  return { token, session: toPublic(record) };
}

export async function validateJsonAiSession(token: string): Promise<AiSessionRecord | null> {
  const tokenHash = hashAiSessionToken(token);
  const file = await readFile();
  const record = file.sessions.find((s) => s.tokenHash === tokenHash);
  if (!record || !isActive(record)) return null;

  record.lastUsedAt = new Date().toISOString();
  if (record.oneTime) {
    record.usedAt = record.lastUsedAt;
  }
  await writeFile(file);
  return record;
}

export async function revokeJsonAiSession(sessionId: string): Promise<boolean> {
  const file = await readFile();
  const record = file.sessions.find((s) => s.id === sessionId);
  if (!record) return false;
  record.revokedAt = new Date().toISOString();
  await writeFile(file);
  return true;
}

export async function listJsonAiSessions(): Promise<AiSessionPublic[]> {
  const file = await readFile();
  const now = Date.now();
  return file.sessions
    .filter((s) => isActive(s, now))
    .map(toPublic)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
