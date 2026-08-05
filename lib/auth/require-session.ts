import { redirect } from "next/navigation";
import { hasArgusSession, hasTradingSession } from "./cookies";
import { argusAuthRequired, tradingAuthRequired } from "./passwords";

export async function requireTradingSession(): Promise<void> {
  if (!tradingAuthRequired()) return;
  if (!(await hasTradingSession())) {
    redirect("/login");
  }
}

export async function requireArgusSession(options?: { next?: string }): Promise<void> {
  if (!argusAuthRequired()) return;
  if (!(await hasArgusSession())) {
    const next = options?.next;
    if (
      next &&
      next.startsWith("/") &&
      !next.startsWith("//") &&
      !next.includes("\\") &&
      (next === "/forge" || next.startsWith("/forge/") || next.startsWith("/argus"))
    ) {
      redirect(`/argus/login?next=${encodeURIComponent(next)}`);
    }
    redirect("/argus/login");
  }
}
