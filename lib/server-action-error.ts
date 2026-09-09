import { isRedirectError } from "next/dist/client/components/redirect-error";

export type ActionErrorResult = {
  ok: false;
  error: string;
  details?: string[];
};

export function toActionSafe<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

export function formatActionError(
  err: unknown,
  fallback: string
): ActionErrorResult {
  if (isRedirectError(err)) {
    throw err;
  }
  const message = err instanceof Error ? err.message : fallback;
  return {
    ok: false,
    error: message || fallback,
    details:
      err instanceof Error && err.stack
        ? err.stack
            .split("\n")
            .slice(0, 6)
            .map((line) => line.trim())
        : undefined,
  };
}
