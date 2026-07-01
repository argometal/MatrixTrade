import { promises as fs } from "fs";
import path from "path";

const LOCK_FILE = path.join(process.cwd(), "data", "health-vault", "login-lock.json");
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;

interface LockState {
  failures: number;
  lockedUntil: number | null;
}

async function readState(): Promise<LockState> {
  try {
    const raw = await fs.readFile(LOCK_FILE, "utf-8");
    const parsed = JSON.parse(raw) as LockState;
    return {
      failures: parsed.failures ?? 0,
      lockedUntil: parsed.lockedUntil ?? null,
    };
  } catch {
    return { failures: 0, lockedUntil: null };
  }
}

async function writeState(state: LockState): Promise<void> {
  await fs.mkdir(path.dirname(LOCK_FILE), { recursive: true });
  const tmp = `${LOCK_FILE}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(state)}\n`, "utf-8");
  await fs.rename(tmp, LOCK_FILE);
}

export async function isHealthLoginLocked(): Promise<boolean> {
  const state = await readState();
  if (!state.lockedUntil) return false;
  if (Date.now() >= state.lockedUntil) {
    await writeState({ failures: 0, lockedUntil: null });
    return false;
  }
  return true;
}

export async function getHealthLoginLockRemainingMs(): Promise<number> {
  const state = await readState();
  if (!state.lockedUntil) return 0;
  return Math.max(0, state.lockedUntil - Date.now());
}

export async function recordHealthLoginFailure(): Promise<{ locked: boolean; remainingMs: number }> {
  const state = await readState();
  if (state.lockedUntil && Date.now() < state.lockedUntil) {
    return { locked: true, remainingMs: state.lockedUntil - Date.now() };
  }

  const failures = state.failures + 1;
  if (failures >= MAX_FAILURES) {
    const lockedUntil = Date.now() + LOCK_MS;
    await writeState({ failures, lockedUntil });
    return { locked: true, remainingMs: LOCK_MS };
  }

  await writeState({ failures, lockedUntil: null });
  return { locked: false, remainingMs: 0 };
}

export async function clearHealthLoginFailures(): Promise<void> {
  await writeState({ failures: 0, lockedUntil: null });
}
